function Health() {}

Health.prototype.Schema =
	"<a:help>Deals with hitpoints and death.</a:help>" +
	"<a:example>" +
		"<Max>100</Max>" +
		"<RegenRate>1.0</RegenRate>" +
		"<IdleRegenRate>0</IdleRegenRate>" +
		"<DeathType>corpse</DeathType>" +
	"</a:example>" +
	"<element name='Max' a:help='Maximum hitpoints'>" +
		"<ref name='nonNegativeDecimal'/>" +
	"</element>" +
	"<optional>" +
		"<element name='Initial' a:help='Initial hitpoints. Default if unspecified is equal to Max'>" +
			"<ref name='nonNegativeDecimal'/>" +
		"</element>" +
	"</optional>" +
	"<optional>" +
		"<element name='DamageVariants'>" +
			"<oneOrMore>" +
				"<element a:help='Name of the variant to select when health drops under the defined ratio'>" +
					"<anyName/>" +
					"<data type='decimal'>" +
						"<param name='minInclusive'>0</param>" +
						"<param name='maxInclusive'>1</param>" +
					"</data>" +
				"</element>" +
			"</oneOrMore>" +
		"</element>" +
	"</optional>" +
	"<element name='RegenRate' a:help='Hitpoint regeneration rate per second.'>" +
		"<data type='decimal'/>" +
	"</element>" +
	"<element name='IdleRegenRate' a:help='Hitpoint regeneration rate per second when idle or garrisoned.'>" +
		"<data type='decimal'/>" +
	"</element>" +
	"<element name='DeathType' a:help='Behaviour when the unit dies'>" +
		"<choice>" +
			"<value a:help='Disappear instantly'>vanish</value>" +
			"<value a:help='Turn into a corpse'>corpse</value>" +
			"<value a:help='Remain in the world with 0 health'>remain</value>" +
		"</choice>" +
	"</element>" +
	"<optional>" +
		"<element name='SpawnEntityOnDeath' a:help='Entity template to spawn when this entity dies. Note: this is different than the corpse, which retains the original entity&apos;s appearance'>" +
			"<text/>" +
		"</element>" +
	"</optional>" +
	"<optional>" +
		"<element name='SpawnLootOnDeath' a:help='Same sa SpawnEntityOnDeath just to not interfear with 0ad'>" +
			"<attribute name='datatype'>" +
				"<value>tokens</value>" +
			"</attribute>" +
		"</element>" +
	"</optional>" +
	"<optional>" +
		"<element name='CanBeResurected'>" +
			"<data type='boolean'/>" +
		"</element>" +
	"</optional>" +
	"<element name='Unhealable' a:help='Indicates that the entity can not be healed by healer units'>" +
		"<data type='boolean'/>" +
	"</element>";

Health.prototype.Init = function()
{
	// Cache this value so it allows techs to maintain previous health level
	this.maxHitpoints = +this.template.Max;
	// Default to <Initial>, but use <Max> if it's undefined or zero
	// (Allowing 0 initial HP would break our death detection code)
	this.hitpoints = +(this.template.Initial || this.GetMaxHitpoints());
	this.regenRate = ApplyValueModificationsToEntity("Health/RegenRate", +this.template.RegenRate, this.entity);
	this.idleRegenRate = ApplyValueModificationsToEntity("Health/IdleRegenRate", +this.template.IdleRegenRate, this.entity);
	this.degreesOnMove = ApplyValueModificationsToEntity("Health/DegreesOnMove", 0, this.entity);
 	this.resurectionTimer = undefined;
	this.CheckRegenTimer();
	this.UpdateActor();
	this.resPos = undefined;
};

/**
 * Returns the current hitpoint value.
 * This is 0 if (and only if) the unit is dead.
 */
Health.prototype.GetHitpoints = function()
{
	return this.hitpoints;
};

Health.prototype.GetMaxHitpoints = function()
{
	return this.maxHitpoints;
};

/**
 * @return {boolean} Whether the units are injured. Dead units are not considered injured.
 */
Health.prototype.IsInjured = function()
{
	return this.hitpoints > 0 && this.hitpoints < this.GetMaxHitpoints();
};

Health.prototype.SetHitpoints = function(value)
{
	// If we're already dead, don't allow resurrection
	if (this.hitpoints == 0)
		return;

	// Before changing the value, activate Fogging if necessary to hide changes
	let cmpFogging = Engine.QueryInterface(this.entity, IID_Fogging);
	if (cmpFogging)
		cmpFogging.Activate();

	let old = this.hitpoints;
	this.hitpoints = Math.max(1, Math.min(this.GetMaxHitpoints(), value));

	let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
	if (cmpRangeManager)
		cmpRangeManager.SetEntityFlag(this.entity, "injured", this.IsInjured());

	this.RegisterHealthChanged(old);
};

Health.prototype.IsRepairable = function()
{
	return Engine.QueryInterface(this.entity, IID_Repairable) != null;
};

Health.prototype.IsUnhealable = function()
{
	return this.template.Unhealable == "true" ||
		this.hitpoints <= 0 || !this.IsInjured();
};

Health.prototype.GetIdleRegenRate = function()
{
	return this.idleRegenRate;
};

Health.prototype.GetRegenRate = function()
{
	return this.regenRate;
};

Health.prototype.ExecuteDegree = function()
{
	const degree = this.GetDegreeRate();
	if (!degree)
		return;
	const cmpUnitAI = Engine.QueryInterface(this.entity, IID_UnitAI);
	if (cmpUnitAI && !cmpUnitAI.IsIdle())
		this.Reduce(degree);
}

Health.prototype.ExecuteRegeneration = function()
{
	let regen = this.GetRegenRate();
	if (this.GetIdleRegenRate() != 0)
	{
		let cmpUnitAI = Engine.QueryInterface(this.entity, IID_UnitAI);
		if (cmpUnitAI && (cmpUnitAI.IsIdle() || cmpUnitAI.IsGarrisoned() && !cmpUnitAI.IsTurret()))
			regen += this.GetIdleRegenRate();
	}

	if (regen > 0)
		this.Increase(regen);
	else
		this.Reduce(-regen);
};

Health.prototype.GetDegreeRate = function()
{
	return this.degreesOnMove;
}

Health.prototype.GetLootOnDeath = function()
{
   if (!this.template.SpawnLootOnDeath)
	   return [];
   return this.template.SpawnLootOnDeath._string.split(/\s+/);
}

Health.prototype.CheckDegreeTimer = function()
{
	if (this.GetDegreeRate() == 0 || this.hitpoints == 0) {
		if (this.degreeTimer) {
			const cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
			cmpTimer.CancelTimer(this.degreeTimer);
			this.degreeTimer = undefined;
		}
		return;
	}

	if (this.degreeTimer)
		return;

	const cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
	cmpTimer.SetInterval(this.entity, IID_Health, "ExecuteDegree", 0, 1000, null);
}

/*
 * Check if the regeneration timer needs to be started or stopped
 */
Health.prototype.CheckRegenTimer = function()
{
	// check if we need a timer
	if (this.GetRegenRate() == 0 && this.GetIdleRegenRate() == 0 ||
	    !this.IsInjured() && this.GetRegenRate() >= 0 && this.GetIdleRegenRate() >= 0 ||
	    this.hitpoints == 0)
	{
		// we don't need a timer, disable if one exists
		if (this.regenTimer)
		{
			let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
			cmpTimer.CancelTimer(this.regenTimer);
			this.regenTimer = undefined;
		}
		return;
	}

	// we need a timer, enable if one doesn't exist
	if (this.regenTimer)
		return;

	let cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
	this.regenTimer = cmpTimer.SetInterval(this.entity, IID_Health, "ExecuteRegeneration", 1000, 1000, null);
};

Health.prototype.Kill = function()
{
	this.Reduce(this.hitpoints);
};

/**
 * @param {number} amount - The amount of damage to be taken.
 * @param {number} attacker - The entityID of the attacker.
 * @param {number} attackerOwner - The playerID of the owner of the attacker.
 *
 * @eturn {Object} - Object of the form { "healthChange": number }.
 */
Health.prototype.TakeDamage = function(amount, attacker, attackerOwner)
{
	if (!this.hitpoints)
		return {"healthChange": 0};
	
	let change = this.Reduce(amount);

	let cmpLoot = Engine.QueryInterface(this.entity, IID_Loot);
	if (cmpLoot && cmpLoot.GetXp() > 0 && change.healthChange < 0)
		change.xp = cmpLoot.GetXp() * -change.healthChange / this.GetMaxHitpoints();

	if (!this.hitpoints)
		this.KilledBy(attacker, attackerOwner);
	
	return change;
};

/**
 * Called when an entity kills us.
 * @param {number} attacker - The entityID of the killer.
 * @param {number} attackerOwner - The playerID of the attacker.
 */
Health.prototype.KilledBy = function(attacker, attackerOwner)
{
	let cmpAttackerOwnership = Engine.QueryInterface(attacker, IID_Ownership);
	if (cmpAttackerOwnership)
	{
		let currentAttackerOwner = cmpAttackerOwnership.GetOwner();
		if (currentAttackerOwner != INVALID_PLAYER)
			attackerOwner = currentAttackerOwner;
	}

	// Add to killer statistics.
	let cmpKillerPlayerStatisticsTracker = QueryPlayerIDInterface(attackerOwner, IID_StatisticsTracker);
	if (cmpKillerPlayerStatisticsTracker)
		cmpKillerPlayerStatisticsTracker.KilledEntity(this.entity);

	// Add to loser statistics.
	let cmpTargetPlayerStatisticsTracker = QueryOwnerInterface(this.entity, IID_StatisticsTracker);
	if (cmpTargetPlayerStatisticsTracker)
		cmpTargetPlayerStatisticsTracker.LostEntity(this.entity);

	let cmpLooter = Engine.QueryInterface(attacker, IID_Looter);
	if (cmpLooter)
		cmpLooter.Collect(this.entity);
};

/**
 * @param {number} amount - The amount of hitpoints to substract. Kills the entity if required.
 * @return {{killed:boolean, HPchange:number}} -  Number of health points lost and whether the entity was killed.
 */
Health.prototype.Reduce = function(amount)
{
	// If we are dead, do not do anything
	// (The entity will exist a little while after calling DestroyEntity so this
	// might get called multiple times)
	// Likewise if the amount is 0.
	if (!amount || !this.hitpoints)
		return { "healthChange": 0 };

	// Before changing the value, activate Fogging if necessary to hide changes
	let cmpFogging = Engine.QueryInterface(this.entity, IID_Fogging);
	if (cmpFogging)
		cmpFogging.Activate();

	let oldHitpoints = this.hitpoints;
	// If we reached 0, then die.
	if (amount >= this.hitpoints)
	{
		this.hitpoints = 0;
		this.RegisterHealthChanged(oldHitpoints);
		this.HandleDeath();
		return { "healthChange": -oldHitpoints };
	}

	// If we are not marked as injured, do it now
	if (!this.IsInjured())
	{
		let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
		if (cmpRangeManager)
			cmpRangeManager.SetEntityFlag(this.entity, "injured", true);
	}

	this.hitpoints -= amount;
	this.RegisterHealthChanged(oldHitpoints);
	return { "healthChange": this.hitpoints - oldHitpoints };
};

/**
 * Handle what happens when the entity dies.
 */
Health.prototype.HandleDeath = function()
{
	let cmpDeathDamage = Engine.QueryInterface(this.entity, IID_DeathDamage);
	if (cmpDeathDamage)
		cmpDeathDamage.CauseDeathDamage();
	PlaySound("death", this.entity);

	if (this.template.SpawnEntityOnDeath)
		this.CreateDeathSpawnedEntity();
	if (this.template.SpawnLootOnDeath)
		this.CreateSpawnedLootEntities();
	switch (this.template.DeathType)
	{
	case "corpse":
		this.CreateCorpse();
		break;

	case "remain":
	{
		let resource = this.CreateCorpse(true);
		if (resource != INVALID_ENTITY)
			Engine.PostMessage(this.entity, MT_EntityRenamed, { "entity": this.entity, "newentity": resource });
		break;
	}

	case "vanish":
		break;

	default:
		error("Invalid template.DeathType: " + this.template.DeathType);
		break;
	}
	//TODO: check for map settings as well
	if (this.template.CanBeResurected)
		this.StartResurectionTimer();
	else {
		const cmpInventory = Engine.QueryInterface(this.entity, IID_Inventory);
		if (cmpInventory)
			cmpInventory.DropAll();
		Engine.DestroyEntity(this.entity);
	}
};

Health.prototype.StartResurectionTimer = function()
{
     if (this.hitpoints) {
		warn("Trying to start resurection timer on alive entity " + this.entity);
		return;
     }
     const cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
     if (!cmpPosition)
		warn("Health.StartResurectionTimer: Entity " + this.entity + " does not have position");
     else if (!cmpPosition.IsInWorld())
     	warn("Health.StartResurectionTimer: Entity " + this.entity + " is already out of world");
     else {
     	this.resPos = cmpPosition.GetPosition();
     	cmpPosition.MoveOutOfWorld();
     }
     const cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
     this.regenerationTimer = cmpTimer.SetTimeout(this.entity, IID_Health, "Resurect", 6 * 1000, null);
}

Health.prototype.Resurect = function()
{
	// Do not resurect alive entity
	if (this.hitpoints) {
		warn("Trying to resurect alive entity " + this.entity);
		return;
    }
	const old = this.hitpoints;
	this.hitpoints = +(this.template.Initial || this.GetMaxHitpoints());

	const cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
	if (cmpRangeManager)
		cmpRangeManager.SetEntityFlag(this.entity, "injured", this.IsInjured());

	this.RegisterHealthChanged(old);
	
    const cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	cmpPosition.JumpTo(this.resPos.x, this.resPos.z);
}

Health.prototype.Increase = function(amount)
{
	// Before changing the value, activate Fogging if necessary to hide changes
	let cmpFogging = Engine.QueryInterface(this.entity, IID_Fogging);
	if (cmpFogging)
		cmpFogging.Activate();

	if (!this.IsInjured())
		return { "old": this.hitpoints, "new": this.hitpoints };

	// If we're already dead, don't allow resurrection
	if (this.hitpoints == 0)
		return undefined;

	let old = this.hitpoints;
	this.hitpoints = Math.min(this.hitpoints + amount, this.GetMaxHitpoints());

	if (!this.IsInjured())
	{
		let cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
		if (cmpRangeManager)
			cmpRangeManager.SetEntityFlag(this.entity, "injured", false);
	}

	this.RegisterHealthChanged(old);

	return { "old": old, "new": this.hitpoints };
};

Health.prototype.CreateCorpse = function(leaveResources)
{
	// If the unit died while not in the world, don't create any corpse for it
	// since there's nowhere for the corpse to be placed
	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (!cmpPosition.IsInWorld())
		return INVALID_ENTITY;

	// Either creates a static local version of the current entity, or a
	// persistent corpse retaining the ResourceSupply element of the parent.
	let cmpTemplateManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_TemplateManager);
	let templateName = cmpTemplateManager.GetCurrentTemplateName(this.entity);
	let corpse;
	if (leaveResources)
		corpse = Engine.AddEntity("resource|" + templateName);
	else
		corpse = Engine.AddLocalEntity("corpse|" + templateName);

	// Copy various parameters so it looks just like us

	let cmpCorpsePosition = Engine.QueryInterface(corpse, IID_Position);
	let pos = cmpPosition.GetPosition();
	cmpCorpsePosition.JumpTo(pos.x, pos.z);
	let rot = cmpPosition.GetRotation();
	cmpCorpsePosition.SetYRotation(rot.y);
	cmpCorpsePosition.SetXZRotation(rot.x, rot.z);

	let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
	let cmpCorpseOwnership = Engine.QueryInterface(corpse, IID_Ownership);
	cmpCorpseOwnership.SetOwner(cmpOwnership.GetOwner());

	let cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
	let cmpCorpseVisual = Engine.QueryInterface(corpse, IID_Visual);
	cmpCorpseVisual.SetActorSeed(cmpVisual.GetActorSeed());

	// Make it fall over
	cmpCorpseVisual.SelectAnimation("death", true, 1.0);

	return corpse;
};

Health.prototype.CreateSpawnedLootEntities = function()
{
	// If the unit died while not in the world, don't spawn a death entity for it
	// since there's nowhere for it to be placed
	const cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (!cmpPosition.IsInWorld())
		return INVALID_ENTITY;
	const pos = cmpPosition.GetPosition();
	const rot = cmpPosition.GetRotation();
	
	const loots = this.GetLootOnDeath();
	for (let i in loots) {
		let spawnedEntity = Engine.AddEntity(loots[i]);
		let cmpSpawnedPosition = Engine.QueryInterface(spawnedEntity, IID_Position);
		cmpSpawnedPosition.JumpTo(pos.x, pos.z);
		cmpSpawnedPosition.SetYRotation(rot.y);
		cmpSpawnedPosition.SetXZRotation(rot.x, rot.z);
	}
}

Health.prototype.CreateDeathSpawnedEntity = function()
{
	// If the unit died while not in the world, don't spawn a death entity for it
	// since there's nowhere for it to be placed
	let cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (!cmpPosition.IsInWorld())
		return INVALID_ENTITY;

	// Create SpawnEntityOnDeath entity
	let spawnedEntity = Engine.AddLocalEntity(this.template.SpawnEntityOnDeath);

	// Move to same position
	let cmpSpawnedPosition = Engine.QueryInterface(spawnedEntity, IID_Position);
	let pos = cmpPosition.GetPosition();
	cmpSpawnedPosition.JumpTo(pos.x, pos.z);
	let rot = cmpPosition.GetRotation();
	cmpSpawnedPosition.SetYRotation(rot.y);
	cmpSpawnedPosition.SetXZRotation(rot.x, rot.z);

	let cmpOwnership = Engine.QueryInterface(this.entity, IID_Ownership);
	let cmpSpawnedOwnership = Engine.QueryInterface(spawnedEntity, IID_Ownership);
	if (cmpOwnership && cmpSpawnedOwnership)
		cmpSpawnedOwnership.SetOwner(cmpOwnership.GetOwner());

	return spawnedEntity;
};

Health.prototype.UpdateActor = function()
{
	if (!this.template.DamageVariants)
		return;
	let ratio = this.hitpoints / this.GetMaxHitpoints();
	let newDamageVariant = "alive";
	if (ratio > 0)
	{
		let minTreshold = 1;
		for (let key in this.template.DamageVariants)
		{
			let treshold = +this.template.DamageVariants[key];
			if (treshold < ratio || treshold > minTreshold)
				continue;
			newDamageVariant = key;
			minTreshold = treshold;
		}
	}
	else
		newDamageVariant = "death";

	if (this.damageVariant && this.damageVariant == newDamageVariant)
		return;

	this.damageVariant = newDamageVariant;

	let cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
	if (cmpVisual)
		cmpVisual.SetVariant("health", newDamageVariant);
};

Health.prototype.RecalculateValues = function()
{
	let oldMaxHitpoints = this.GetMaxHitpoints();
	let newMaxHitpoints = ApplyValueModificationsToEntity("Health/Max", +this.template.Max, this.entity);
	if (oldMaxHitpoints != newMaxHitpoints)
	{
		let newHitpoints = this.hitpoints * newMaxHitpoints/oldMaxHitpoints;
		warn ("newHitpoints:" + newHitpoints);
		this.maxHitpoints = newMaxHitpoints;
		this.SetHitpoints(newHitpoints);
	}

	let oldRegenRate = this.regenRate;
	this.regenRate = ApplyValueModificationsToEntity("Health/RegenRate", +this.template.RegenRate, this.entity);

	let oldIdleRegenRate = this.idleRegenRate;
	this.idleRegenRate = ApplyValueModificationsToEntity("Health/IdleRegenRate", +this.template.IdleRegenRate, this.entity);

	let oldDegreesOnMove = this.degreesOnMove;
	this.degreesOnMove = ApplyValueModificationsToEntity("Health/DegreesOnMove", 0, this.entity);

	if (this.regenRate != oldRegenRate || this.idleRegenRate != oldIdleRegenRate)
		this.CheckRegenTimer();

	if (this.degreesOnMove != oldDegreesOnMove)
		this.CheckDegreeTimer();
}

Health.prototype.OnValueModification = function(msg)
{
	if (msg.component == "Health")
		this.RecalculateValues();
};

Health.prototype.OnOwnershipChanged = function(msg)
{
	if (msg.to != INVALID_PLAYER)
		this.RecalculateValues();
}

Health.prototype.RegisterHealthChanged = function(from)
{
	this.CheckRegenTimer();
	this.UpdateActor();
	Engine.PostMessage(this.entity, MT_HealthChanged, { "from": from, "to": this.hitpoints });
};

Engine.RegisterComponentType(IID_Health, "Health", Health);
