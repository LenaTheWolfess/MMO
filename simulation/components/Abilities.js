function Abilities () {}

Abilities.prototype.animationSchema = 
	"<interleave>" +
		"<element name='Name'>"+
			"<text/>" +
		"</element>" +
		"<element name='Duration'>" +
			"<ref name='nonNegativeDecimal'/>" +
		"</element>" +
	"</interleave>";

Abilities.prototype.SplashSchema = 
	"<optional>" +
		"<element name='Splash'>" +
			"<interleave>" +
				"<element name='Shape' a:help='Shape of the splash damage, can be circular or linear'><text/></element>" +
				"<element name='Range' a:help='Size of the area affected by the splash'><ref name='nonNegativeDecimal'/></element>" +
				"<element name='FriendlyFire' a:help='Whether the splash damage can hurt non enemy units'><data type='boolean'/></element>" +
				Attacking.BuildAttackEffectsSchema() +
			"</interleave>" +
		"</element>" +
	"</optional>";

Abilities.prototype.abilitySchema = 
	"<interleave>" +
		"<element name='Icon'>" +
			"<text/>" +
		"</element>" +
		"<element name='Cooldown'>" +
			"<ref name='nonNegativeDecimal'/>" +
		"</element>" +
		"<optional>" +
			"<element name='PreAnimation'>" +
				Abilities.prototype.animationSchema +
			"</element>" +
		"</optional>" +
		"<optional>" +
			"<element name='Delay'>" +
				"<ref name='nonNegativeDecimal'/>" +
			"</element>" +
		"</optional>" +
		"<optional>" +
			"<element name='MoveOutOfWorld'>" +
				"<data type='boolean'/>" +
			"</element>" +
		"</optional>" +
		"<optional>" +
			"<element name='Animation'>" +
				Abilities.prototype.animationSchema +
			"</element>" +
		"</optional>" +
		"<element name='AbilityName'>"+
			"<text/>" +
		"</element>" +
		"<element name='Range'>" +
			"<ref name='nonNegativeDecimal'/>" +
		"</element>" +
		"<optional>" +
			"<element name='Charge'>" +
				"<ref name='nonNegativeDecimal'/>" +
			"</element>" +
		"</optional>" +
		"<optional>" +
			"<element name='DealDamage'>" +
				"<interleave>" +
					"<optional>" +
						"<element name='Melee'>" +
							"<interleave>" +
								Attacking.BuildAttackEffectsSchema() +
								Abilities.prototype.SplashSchema +
							"</interleave>" +
						"</element>" +
					"</optional>" +
					"<optional>" +
						"<element name='Ranged'>" +
							"<interleave>" +
								Attacking.BuildAttackEffectsSchema() +
								Abilities.prototype.SplashSchema +
								"<optional>" +
									"<element name='ImpactAnimation'>" +
										"<text/>" +
									"</element>" +
								"</optional>" +
							"</interleave>" +
						"</element>" +
					"</optional>" +
				"</interleave>" +
			"</element>" +
		"</optional>" +
		"<optional>" +
			"<element name='PostDelay'>" +
			"<ref name='nonNegativeDecimal'/>" +
			"</element>" +
		"</optional>" +
		"<optional>" +
			"<element name='Reposition'>" +
				"<data type='boolean'/>" +
			"</element>" +
		"</optional>" +
	"</interleave>";

Abilities.prototype.Schema = 
	"<optional>" +
		"<element name='Ability1'>" +
			Abilities.prototype.abilitySchema +
		"</element>" +
	"</optional>" + 
	"<optional>" +
		"<element name='Ability2'>" +
			Abilities.prototype.abilitySchema +
		"</element>" +
	"</optional>" +
	"<optional>" +
		"<element name='Ability3'>" +
			Abilities.prototype.abilitySchema +
		"</element>" +
	"</optional>";

Abilities.prototype.GetAbility = function(number)
{
	return this.template["Ability"+number] || undefined;
}

Abilities.prototype.HasAbility = function(number)
{
	return !!this.template["Ability"+number];
}

Abilities.prototype.GetName = function(number)
{
	return this.GetAbility(number).AbilityName;
}

Abilities.prototype.GetPreDuration = function(number)
{
	return +this.GetAbility(number).PreAnimation.Duration;
}

Abilities.prototype.GetDuration = function(number)
{
	return +this.GetAbility(number).Animation.Duration;
}

Abilities.prototype.GetPreAnimation = function(number)
{
	return this.GetAbility(number).PreAnimation.Name;
}

Abilities.prototype.GetAnimation = function(number)
{
	return this.GetAbility(number).Animation.Name;
}

Abilities.prototype.GetCooldown = function(number)
{
	if (!this.cooldowns)
		return 0;
	return this.cooldowns[number];
}

Abilities.prototype.GetDelay = function(number)
{
	const ability = this.GetAbility(number);
	if (!ability.Delay)
		return 0;
	return +ability.Delay;
}

Abilities.prototype.GetRange = function(number)
{
	const ability = this.GetAbility(number);
	if (!ability)
		return undefined;
	warn(ability.Range);
	return {"min": 0, "max": +ability.Range, "elevationBonus": 0};
}

Abilities.prototype.GetPostDelay = function(number)
{
	const ability = this.GetAbility(number);
	if (!ability.PostDelay)
		return 0;
	return +ability.PostDelay;
}

Abilities.prototype.Tick = function(number)
{
	this.cooldowns[number]--;
	if (!this.cooldowns[number] || this.cooldowns[number] < 0) {
		const cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
		cmpTimer.CancelTimer(this.timers[number]);
		delete this.timers[number];
		this.cooldowns[number] = 0;
	}
}

Abilities.prototype.IsOnCooldown = function(number)
{
	if (!this.cooldowns)
		return false;
	if (!this.cooldowns[number])
		return false;
	warn(number + " cooldown " + this.cooldowns[number]);
	return true;
}

Abilities.prototype.StartCooldown = function(number)
{
	const ability = this.GetAbility(number);
	const cooldown = (+ability.Cooldown) * 1000;
	const cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
	
	if (!this.timers)
		this.timers = [];
	if (!this.cooldowns)
		this.cooldowns = [];
	
	if (this.timers[number] || this.cooldowns[number]) {
		warn("trying to start multiple cooldowns on ability " + number);
		return;
	}
	
	this.timers[number] = cmpTimer.SetInterval(this.entity, IID_Abilities, "Tick", cooldown, cooldown, number);
	this.cooldowns[number] = +ability.Cooldown;
}

Abilities.prototype.Execute = function(number, data)
{
	const ability = this.GetAbility(number);
	if (!ability)
		return false;
	
	if (this.IsActive()) {
		warn("Cannot start ability " + ability.AbilityName);
		return false;
	}
	
	if (this.IsOnCooldown(number)) {
		warn("Ability " + ability.AbilityName + " is on cooldown");
		return false;
	}
	
	this.StartCooldown(number);
	
	if (ability.DealDamage) {
		let selfPosition;
		const cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
		if (cmpPosition && cmpPosition.IsInWorld())
			selfPosition = cmpPosition.GetPosition();
			
		if (data.target) {
			const cmpTargetPosition = Engine.QueryInterface(data.target, IID_Position);
			if (cmpTargetPosition && cmpTargetPosition.IsInWorld())
				data.pos = cmpTargetPosition.GetPosition();
		} else if (!data.pos)
			data.pos = selfPosition;
		
		if (!data.pos)
			warn("ability was given no position");
		else {
			let realHorizDistance = data.pos.horizDistanceTo(selfPosition);
			data.direction = Vector3D.sub(data.pos, selfPosition).div(realHorizDistance);
		}
	}
	
	if (ability.PreAnimation) {
		this.StartPreAnimation(number);
		this.StartPreTimer(data);
		return true;
	}
	
	if (ability.Delay) {
		this.DelayCheck(data);
		return true;
	}
	
	this.Action(data);
	return true;
}

Abilities.prototype.DelayCheck = function(data)
{
	const ability = this.GetAbility(data.number);
	if (this.timer)
		delete this.timer;
	if (ability.MoveOutOfWorld) {
		const cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
		if (cmpPosition)
			cmpPosition.MoveOutOfWorld();
	}
	const cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
	this.timer = cmpTimer.SetTimeout(this.entity, IID_Abilities, "Action", +ability.Delay, data);
}

Abilities.prototype.Action = function(data)
{
	if (this.timer)
		delete this.timer;
	const ability = this.GetAbility(data.number);
	if (ability.Reposition) {
		let pos;
		if (data.target) {
			const cmpTargetPosition = Engine.QueryInterface(data.target, IID_Position);
			if (cmpTargetPosition && cmpTargetPosition.IsInWorld())
				pos = cmpTargetPosition.GetPosition();
		}
			
		if (pos) {
			const cmpPosition = Engine.QueryInterface(this.entity, IID_Position);
			cmpPosition.JumpTo(pos.x, pos.z);
			data.pos = pos;
		}
	}
	
	if (ability.Animation) {
		this.StartAnimation(data.number);
		this.StartTimer(data);
		return;
	}
	
	this.DealDamage(data);
}

Abilities.prototype.IsActive = function()
{
	return !!this.timer;
}

Abilities.prototype.StartPreTimer = function(data)
{
	const cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
	this.timer = cmpTimer.SetTimeout(this.entity, IID_Abilities, "Action", +this.GetPreDuration(data.number) + this.GetDelay(data.number), data);
}

Abilities.prototype.StartTimer = function(data)
{
	const cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
	this.timer = cmpTimer.SetTimeout(this.entity, IID_Abilities, "DealDamage", +this.GetDuration(data.number), data);
}

Abilities.prototype.DealDamage = function(data)
{
	const ability = this.GetAbility(data.number);
	if (ability.DealDamage) {
		let type = "Melee";
		if (ability.DealDamage[type]) {
			warn("Ability " + data.number + " deals " + type + " damage");
			const rootPath = "Abilities/Ability"+data.number+"/DealDamage/"+type;
			const damageTemplate = ability.DealDamage[type];

			let attackImpactSound = "";
			const cmpSound = Engine.QueryInterface(this.entity, IID_Sound);
			if (cmpSound)
				attackImpactSound = cmpSound.GetSoundGroup("attack_impact_" + type.toLowerCase());

			const cmpDelayedDamage = Engine.QueryInterface(SYSTEM_ENTITY, IID_DelayedDamage);
			let dmgData = {
				"type": type,
				"attackData": Attacking.GetAttackEffectsData(rootPath, damageTemplate, this.entity),
				"attacker": this.entity,
				"attackerOwner": Engine.QueryInterface(this.entity, IID_Ownership).GetOwner(),
				"position": data.pos,
				"direction": data.direction,
				"attackImpactSound": attackImpactSound,
				"friendlyFire": false
			};
			if (damageTemplate.Splash) {
				dmgData.splash = {
					"attackData": Attacking.GetAttackEffectsData(rootPath+"/Splash", damageTemplate.Splash, this.entity),
					"friendlyFire": false,
					"radius": +damageTemplate.Splash.Range,
					"shape": damageTemplate.Splash.Shape
				};
			}
			cmpDelayedDamage.AreaHit(dmgData, 0);
		}
		type = "Ranged";
		if (ability.DealDamage[type]) {
			warn("Ability " + data.number + " deals " + type + " damage");
			const rootPath = "Abilities/Ability"+data.number+"/DealDamage/"+type;
			const damageTemplate = ability.DealDamage[type];

			let attackImpactSound = "";
			const cmpSound = Engine.QueryInterface(this.entity, IID_Sound);
			if (cmpSound)
				attackImpactSound = cmpSound.GetSoundGroup("attack_impact_" + type.toLowerCase());

			const cmpDelayedDamage = Engine.QueryInterface(SYSTEM_ENTITY, IID_DelayedDamage);
			let dmgData = {
				"type": type,
				"attackData": Attacking.GetAttackEffectsData(rootPath, damageTemplate, this.entity),
				"attacker": this.entity,
				"attackerOwner": Engine.QueryInterface(this.entity, IID_Ownership).GetOwner(),
				"position": data.pos,
				"direction": data.direction,
				"attackImpactSound": attackImpactSound,
				"friendlyFire": false
			};
			if (damageTemplate.Splash) {
				dmgData.splash = {
					"attackData": Attacking.GetAttackEffectsData(rootPath+"/Splash", damageTemplate.Splash, this.entity),
					"friendlyFire": false,
					"radius": +damageTemplate.Splash.Range,
					"shape": damageTemplate.Splash.Shape
				};
			}
			if (damageTemplate.ImpactAnimation) {
				dmgData.animation = damageTemplate.ImpactAnimation;
			}
			cmpDelayedDamage.AreaHit(dmgData, 0);
		}
	}
	if (this.timer)
		delete this.timer;
	if (!ability.PostDelay) {
		this.FinishAbility(data.number);
		return;
	}
	
	const cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
	this.timer = cmpTimer.SetTimeout(this.entity, IID_Abilities, "FinishAbility", +this.GetPostDelay(data.number), data.number);	
}

Abilities.prototype.FinishAbility = function(number)
{
	warn("Abilities.FinishAbility " + number);
	if (this.timer)
		delete this.timer;
	const cmpUnitAI = Engine.QueryInterface(this.entity, IID_UnitAI);
	if (cmpUnitAI)
		cmpUnitAI.FinishAbility(number);
}

Abilities.prototype.StartAnimation = function(number)
{
	this.SelectAnimation(this.GetAnimation(number), +this.GetDuration(number));
}

Abilities.prototype.StartPreAnimation = function(number)
{
	this.SelectAnimation(this.GetPreAnimation(number), +this.GetPreDuration(number));
}

Abilities.prototype.SelectAnimation = function(name, duration)
{
	const cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
	if (!cmpVisual)
		return;

	cmpVisual.SelectAnimation(name, true, 1);
	cmpVisual.SetAnimationSyncRepeat(duration);
	cmpVisual.SetAnimationSyncOffset(0);
}

Abilities.prototype.GetActiveAbilities = function()
{
	let res = [];
	for (let i = 1; i < 7; ++i) {
		const ability = this.GetAbility(i);
		if (ability) {
			res[i] = {
				"Name": ability.AbilityName,
				"Cooldown": this.GetCooldown(i),
				"template": ability
			};
		}
	}
	return res;
}

Engine.RegisterComponentType(IID_Abilities, "Abilities", Abilities);