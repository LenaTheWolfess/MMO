function layoutSelectionSingle()
{
	Engine.GetGUIObjectByName("detailsAreaSingle").hidden = false;
	Engine.GetGUIObjectByName("detailsAreaSingleMMO").hidden = false;
	Engine.GetGUIObjectByName("detailsAreaMultiple").hidden = true;
}

function layoutSelectionMultiple()
{
	Engine.GetGUIObjectByName("detailsAreaMultiple").hidden = false;
	Engine.GetGUIObjectByName("detailsAreaSingleMMO").hidden = false;
	Engine.GetGUIObjectByName("detailsAreaSingle").hidden = true;
}

function getResourceTypeDisplayName(resourceType)
{
	return resourceNameFirstWord(
		resourceType.generic == "treasure" ?
			resourceType.specific :
			resourceType.generic);
}

// Updates the health bar of garrisoned units
function updateGarrisonHealthBar(entState, selection)
{
	if (!entState.garrisonHolder)
		return;

	// Summing up the Health of every single unit
	let totalGarrisonHealth = 0;
	let maxGarrisonHealth = 0;
	for (let selEnt of selection)
	{
		let selEntState = GetEntityState(selEnt);
		if (selEntState.garrisonHolder)
			for (let ent of selEntState.garrisonHolder.entities)
			{
				let state = GetEntityState(ent);
				totalGarrisonHealth += state.hitpoints || 0;
				maxGarrisonHealth += state.maxHitpoints || 0;
			}
	}

	// Configuring the health bar
	let healthGarrison = Engine.GetGUIObjectByName("healthGarrison");
	healthGarrison.hidden = totalGarrisonHealth <= 0;
	if (totalGarrisonHealth > 0)
	{
		let healthBarGarrison = Engine.GetGUIObjectByName("healthBarGarrison");
		let healthSize = healthBarGarrison.size;
		healthSize.rtop = 100 - 100 * Math.max(0, Math.min(1, totalGarrisonHealth / maxGarrisonHealth));
		healthBarGarrison.size = healthSize;

		healthGarrison.tooltip = getCurrentHealthTooltip({
			"hitpoints": totalGarrisonHealth,
			"maxHitpoints": maxGarrisonHealth
		});
	}
}

function displaySingleMMO(entState)
{
	let template = GetTemplateData(entState.template);
	let specificName = template.name.specific;
	let genericName = template.name.generic;
	
	let playerState = g_Players[entState.player];

	let civName = g_CivData[playerState.civ].Name;
	let civEmblem = g_CivData[playerState.civ].Emblem;
	let playerName = playerState.name;
	
	let playerNameSection = Engine.GetGUIObjectByName("playerName");
	playerNameSection.hidden = false;
	playerNameSection.caption = playerName;
	
	let level = Engine.GetGUIObjectByName("playerLevel");
	level.hidden = false;
	level.caption = entState.experience.level;
	
	// Health
	let healthSection = Engine.GetGUIObjectByName("healthSectionMMO");
	healthSection.hidden = false;
	let healthBar = Engine.GetGUIObjectByName("healthBarMMO");
	let healthSize = healthBar.size;
		healthSize.rright = 100 * Math.max(0, Math.min(1, entState.hitpoints / entState.maxHitpoints));
		healthBar.size = healthSize;
		Engine.GetGUIObjectByName("healthStatsMMO").caption = sprintf(translate("%(hitpoints)s / %(maxHitpoints)s"), {
			"hitpoints": Math.ceil(entState.hitpoints),
			"maxHitpoints": Math.ceil(entState.maxHitpoints)
		});
	
	let aRef;
	// Abilities
	if (!entState.abilities) {
		for (let i = 0; i < 6; ++i) {
			let aButton = Engine.GetGUIObjectByName("abilityButton["+i+"]");
			if (aButton)
				aButton.hidden = true;
		}
	} else {
		for (let i = 0; i < 6; ++i) {
			const aButton = Engine.GetGUIObjectByName("abilityButton["+i+"]");
			if (aButton) {
				const aIcon = Engine.GetGUIObjectByName("abilityIcon["+i+"]");
				aButton.hidden = false;
				if (!aRef)
					aRef = aButton;
				let aSize = aButton.size;
				aSize.left = aRef.size.left + 46*i;
				aSize.right = aRef.size.right + 46*i;
				aButton.size = aSize;
				let abilityKey = Engine.GetGUIObjectByName("abilityKey["+i+"]");
				abilityKey.caption = (i+1);
				const abilityCooldown = Engine.GetGUIObjectByName("abilityCooldown["+i+"]");
				const ability = entState.abilities[i+1];
				abilityCooldown.caption = "";
				aButton.tooltip = "";
				if (!ability) {
					aIcon.hidden = true;
					continue;
				}
				let modifier;
				const cooldown = entState.abilities[i+1].Cooldown;
				if (cooldown) {
					abilityCooldown.caption = cooldown;
					modifier = "grayscale:";
				}
				if (ability.Name)
					aButton.tooltip = ability.Name;
				const aTemplate = ability.template;
				aIcon.sprite = modifier + "stretched:session/portraits/" + aTemplate.Icon + ".png";
				aIcon.hidden = false;
			}
		}
	}
	
	// Inventory
	let inventoryButton = Engine.GetGUIObjectByName("inventoryButton");
	let inventoryPanel = Engine.GetGUIObjectByName("inventoryPanel");
	aRef = undefined;
	inventoryButton.onPress = function() {
		inventoryPanel.hidden = !inventoryPanel.hidden;
		if (!inventoryPanel.hidden) {
			for (let i = 0; i < 6; ++i) {
				let button = Engine.GetGUIObjectByName("inventoryButton["+i+"]");
				let icon = Engine.GetGUIObjectByName("inventoryIcon["+i+"]");
				if (!aRef)
					aRef = button;
				button.hidden = false;
				let aSize = button.size;
				aSize.left = aRef.size.left + 46*i;
				aSize.right = aRef.size.right + 46*i;
				button.size = aSize;			
			}
		}
	};
	if (!inventoryPanel.hidden) {
		let items = entState.inventory.items;
		for (let i = 0; i < 6; ++i) {
			let item = items[i];
			let button = Engine.GetGUIObjectByName("inventoryButton["+i+"]");
			let icon = Engine.GetGUIObjectByName("inventoryIcon["+i+"]");
			if (!item) {
				hideButton(button);
				hideButton(icon, true);
				continue;
			}
			let itemState = GetEntityState(item.id);
			let template = GetTemplateData(itemState.template);
			if (!template) {
				hideButton(button);
				hideButton(icon, true);
				continue;
			}
			let tooltips = [
				getEntityNamesFormatted,
				getVisibleEntityClassesFormatted,
				getAurasTooltip,
				getEntityTooltip
			].map(func => func(template));
			button.onPress = function() { unequipItem(item.id); };
			button.onPressRight = function() { dropItem(item.id); };
			button.tooltip = tooltips.join("\n");
			button.enabled = true;
			let modifier = "";
			if (template.icon) {
				icon.hidden = false;
				icon.sprite = modifier + "stretched:session/portraits/" + template.icon;
			}				
		}
	}
	
	// Bag
	let bagButton = Engine.GetGUIObjectByName("bagButton");
	let bagPanel = Engine.GetGUIObjectByName("bagPanel");
	aRef = undefined;
	bagButton.onPress = function() {
		bagPanel.hidden = !bagPanel.hidden;
		if (!bagPanel.hidden) {
			let x = 0;
			let y = 0;
			let line = 6;
			for (let i = 0; i < 24; ++i) {
				let button = Engine.GetGUIObjectByName("bagButton["+i+"]");
				let icon = Engine.GetGUIObjectByName("bagIcon["+i+"]");
				if (!aRef)
					aRef = button;
				button.hidden = false;
				let aSize = button.size;
				aSize.left = aRef.size.left + 46*x;
				aSize.right = aRef.size.right + 46*x;
				aSize.top = aRef.size.top + 46*y;
				aSize.bottom = aRef.size.bottom + 46*y;
				button.size = aSize;
				x++;
				if (x == line) {
					x = 0;
					y++;
				}
			}
		}
	};
	
	if (!bagPanel.hidden) {
		let items = entState.inventory.bag;
		for (let i = 0; i < 24; ++i) {
			let item = items[i];
			let button = Engine.GetGUIObjectByName("bagButton["+i+"]");
			let icon = Engine.GetGUIObjectByName("bagIcon["+i+"]");
			if (!item) {
				hideButton(button);
				hideButton(icon, true);
				continue;
			}
			let itemState = GetEntityState(item.id);
			let template = GetTemplateData(itemState.template);
			if (!template) {
				hideButton(button);
				hideButton(icon, true);
				continue;
			}
			let tooltips = [
				getEntityNamesFormatted,
				getVisibleEntityClassesFormatted,
				getAurasTooltip,
				getEntityTooltip
			].map(func => func(template));
			let usable = true;
			let rc = undefined;
			if (itemState.equipment) {
				usable = itemState.equipment.usable;
				rc = itemState.equipment.category;
			}
			if (usable)
				button.onPress = function() { useItem(item.id); };
			else
				button.onPress = function() {};

			button.onPressRight = function() { dropItem(item.id); };
			button.tooltip = tooltips.join("\n");
			button.enabled = true;
			let modifier = "";
			if (!usable) {
				modifier += "color: 100 0 0 127:grayscale:";
				tooltips.push("Required class: " + rc);
			}
			button.tooltip = tooltips.join("\n");
			if (template.icon) {
				icon.hidden = false;
				icon.sprite = modifier + "stretched:session/portraits/" + template.icon;
			}				
		}
	}
	
	Engine.GetGUIObjectByName("detailsAreaSingle").hidden = true;
	Engine.GetGUIObjectByName("detailsAreaMultiple").hidden = true;
	Engine.GetGUIObjectByName("detailsAreaSingleMMO").hidden = false;
	
}

function hideButton(button, icon = false)
{
	button.onPress = function() { };
	button.onPressRight = function() { };
	button.tooltip = "";
	button.enabled = false;
	if (icon) {
		button.hidden = true;
		button.sprite = "";
	}
}

// Fills out information that most entities have
function displaySingle(entState)
{
	// Get general unit and player data
	let template = GetTemplateData(entState.template);
	let specificName = template.name.specific;
	let genericName = template.name.generic;
	// If packed, add that to the generic name (reduces template clutter)
	if (genericName && template.pack && template.pack.state == "packed")
		genericName = sprintf(translate("%(genericName)s — Packed"), { "genericName": genericName });
	let playerState = g_Players[entState.player];

	let civName = g_CivData[playerState.civ].Name;
	let civEmblem = g_CivData[playerState.civ].Emblem;

	let playerName = playerState.name;

	// Indicate disconnected players by prefixing their name
	if (g_Players[entState.player].offline)
		playerName = sprintf(translate("\\[OFFLINE] %(player)s"), { "player": playerName });

	// Rank
	if (entState.identity && entState.identity.rank && entState.identity.classes)
	{
		Engine.GetGUIObjectByName("rankIcon").tooltip = sprintf(translate("%(rank)s Rank"), {
			"rank": translateWithContext("Rank", entState.identity.rank)
		});
		Engine.GetGUIObjectByName("rankIcon").sprite = "stretched:session/icons/ranks/" + entState.identity.rank + ".png";
		Engine.GetGUIObjectByName("rankIcon").hidden = false;
	}
	else
	{
		Engine.GetGUIObjectByName("rankIcon").hidden = true;
		Engine.GetGUIObjectByName("rankIcon").tooltip = "";
	}

	if (entState.statusEffects)
	{
		let statusEffectsSection = Engine.GetGUIObjectByName("statusEffectsIcons");
		statusEffectsSection.hidden = false;
		let statusIcons = statusEffectsSection.children;
		let i = 0;
		for (let effectName in entState.statusEffects)
		{
			let effect = entState.statusEffects[effectName];
			statusIcons[i].hidden = false;
			statusIcons[i].sprite = "stretched:session/icons/status_effects/" + (effect.Icon || "default") + ".png";
			statusIcons[i].tooltip = getStatusEffectsTooltip(effect, false);
			let size = statusIcons[i].size;
			size.top = i * 18;
			size.bottom = i * 18 + 16;
			statusIcons[i].size = size;

			if (++i >= statusIcons.length)
				break;
		}
		for (; i < statusIcons.length; ++i)
			statusIcons[i].hidden = true;
	}
	else
		Engine.GetGUIObjectByName("statusEffectsIcons").hidden = true;

	let showHealth = entState.hitpoints;
	let showResource = entState.resourceSupply;

	let healthSection = Engine.GetGUIObjectByName("healthSection");
	let captureSection = Engine.GetGUIObjectByName("captureSection");
	let resourceSection = Engine.GetGUIObjectByName("resourceSection");
	let sectionPosTop = Engine.GetGUIObjectByName("sectionPosTop");
	let sectionPosMiddle = Engine.GetGUIObjectByName("sectionPosMiddle");
	let sectionPosBottom = Engine.GetGUIObjectByName("sectionPosBottom");

	// Hitpoints
	healthSection.hidden = !showHealth;
	if (showHealth)
	{
		let unitHealthBar = Engine.GetGUIObjectByName("healthBar");
		let healthSize = unitHealthBar.size;
		healthSize.rright = 100 * Math.max(0, Math.min(1, entState.hitpoints / entState.maxHitpoints));
		unitHealthBar.size = healthSize;
		Engine.GetGUIObjectByName("healthStats").caption = sprintf(translate("%(hitpoints)s / %(maxHitpoints)s"), {
			"hitpoints": Math.ceil(entState.hitpoints),
			"maxHitpoints": Math.ceil(entState.maxHitpoints)
		});

		healthSection.size = sectionPosTop.size;
		captureSection.size = showResource ? sectionPosMiddle.size : sectionPosBottom.size;
		resourceSection.size = showResource ? sectionPosBottom.size : sectionPosMiddle.size;
	}
	else
	{
		captureSection.size = sectionPosBottom.size;
		resourceSection.size = sectionPosTop.size;
	}

	// CapturePoints
	captureSection.hidden = !entState.capturePoints;
	if (entState.capturePoints)
	{
		let setCaptureBarPart = function(playerID, startSize) {
			let unitCaptureBar = Engine.GetGUIObjectByName("captureBar[" + playerID + "]");
			let sizeObj = unitCaptureBar.size;
			sizeObj.rleft = startSize;

			let size = 100 * Math.max(0, Math.min(1, entState.capturePoints[playerID] / entState.maxCapturePoints));
			sizeObj.rright = startSize + size;
			unitCaptureBar.size = sizeObj;
			unitCaptureBar.sprite = "color:" + g_DiplomacyColors.getPlayerColor(playerID, 128);
			unitCaptureBar.hidden = false;
			return startSize + size;
		};

		// first handle the owner's points, to keep those points on the left for clarity
		let size = setCaptureBarPart(entState.player, 0);

		for (let i in entState.capturePoints)
			if (i != entState.player)
				size = setCaptureBarPart(i, size);

		let captureText = sprintf(translate("%(capturePoints)s / %(maxCapturePoints)s"), {
			"capturePoints": Math.ceil(entState.capturePoints[entState.player]),
			"maxCapturePoints": Math.ceil(entState.maxCapturePoints)
		});

		let showSmallCapture = showResource && showHealth;
		Engine.GetGUIObjectByName("captureStats").caption = showSmallCapture ? "" : captureText;
		Engine.GetGUIObjectByName("capture").tooltip = showSmallCapture ? captureText : "";
	}

	// Experience
	Engine.GetGUIObjectByName("experience").hidden = !entState.promotion;
	if (entState.promotion)
	{
		let experienceBar = Engine.GetGUIObjectByName("experienceBar");
		let experienceSize = experienceBar.size;
		experienceSize.rtop = 100 - (100 * Math.max(0, Math.min(1, 1.0 * +entState.promotion.curr / +entState.promotion.req)));
		experienceBar.size = experienceSize;

		if (entState.promotion.curr < entState.promotion.req)
			Engine.GetGUIObjectByName("experience").tooltip = sprintf(translate("%(experience)s %(current)s / %(required)s"), {
				"experience": "[font=\"sans-bold-13\"]" + translate("Experience:") + "[/font]",
				"current": Math.floor(entState.promotion.curr),
				"required": entState.promotion.req
			});
		else
			Engine.GetGUIObjectByName("experience").tooltip = sprintf(translate("%(experience)s %(current)s"), {
				"experience": "[font=\"sans-bold-13\"]" + translate("Experience:") + "[/font]",
				"current": Math.floor(entState.promotion.curr)
			});
	}

	// Resource stats
	resourceSection.hidden = !showResource;
	if (entState.resourceSupply)
	{
		let resources = entState.resourceSupply.isInfinite ? translate("∞") :  // Infinity symbol
			sprintf(translate("%(amount)s / %(max)s"), {
				"amount": Math.ceil(+entState.resourceSupply.amount),
				"max": entState.resourceSupply.max
			});

		let unitResourceBar = Engine.GetGUIObjectByName("resourceBar");
		let resourceSize = unitResourceBar.size;

		resourceSize.rright = entState.resourceSupply.isInfinite ? 100 :
			100 * Math.max(0, Math.min(1, +entState.resourceSupply.amount / +entState.resourceSupply.max));
		unitResourceBar.size = resourceSize;

		Engine.GetGUIObjectByName("resourceLabel").caption = sprintf(translate("%(resource)s:"), {
			"resource": getResourceTypeDisplayName(entState.resourceSupply.type)
		});
		Engine.GetGUIObjectByName("resourceStats").caption = resources;

	}

	let resourceCarryingIcon = Engine.GetGUIObjectByName("resourceCarryingIcon");
	let resourceCarryingText = Engine.GetGUIObjectByName("resourceCarryingText");
	resourceCarryingIcon.hidden = false;
	resourceCarryingText.hidden = false;

	// Resource carrying
	if (entState.resourceCarrying && entState.resourceCarrying.length)
	{
		// We should only be carrying one resource type at once, so just display the first
		let carried = entState.resourceCarrying[0];
		resourceCarryingIcon.sprite = "stretched:session/icons/resources/" + carried.type + ".png";
		resourceCarryingText.caption = sprintf(translate("%(amount)s / %(max)s"), { "amount": carried.amount, "max": carried.max });
		resourceCarryingIcon.tooltip = "";
	}
	// Use the same indicators for traders
	else if (entState.trader && entState.trader.goods.amount)
	{
		resourceCarryingIcon.sprite = "stretched:session/icons/resources/" + entState.trader.goods.type + ".png";
		let totalGain = entState.trader.goods.amount.traderGain;
		if (entState.trader.goods.amount.market1Gain)
			totalGain += entState.trader.goods.amount.market1Gain;
		if (entState.trader.goods.amount.market2Gain)
			totalGain += entState.trader.goods.amount.market2Gain;
		resourceCarryingText.caption = totalGain;
		resourceCarryingIcon.tooltip = sprintf(translate("Gain: %(gain)s"), {
			"gain": getTradingTooltip(entState.trader.goods.amount)
		});
	}
	// And for number of workers
	else if (entState.foundation)
	{
		resourceCarryingIcon.sprite = "stretched:session/icons/repair.png";
		resourceCarryingIcon.tooltip = getBuildTimeTooltip(entState);
		resourceCarryingText.caption = entState.foundation.numBuilders ?
			Engine.FormatMillisecondsIntoDateStringGMT(entState.foundation.buildTime.timeRemaining * 1000, translateWithContext("countdown format", "m:ss")) : "";
	}
	else if (entState.resourceSupply && (!entState.resourceSupply.killBeforeGather || !entState.hitpoints))
	{
		resourceCarryingIcon.sprite = "stretched:session/icons/repair.png";
		resourceCarryingText.caption = sprintf(translate("%(amount)s / %(max)s"), {
			"amount": entState.resourceSupply.numGatherers,
			"max": entState.resourceSupply.maxGatherers
		});
		Engine.GetGUIObjectByName("resourceCarryingIcon").tooltip = translate("Current/max gatherers");
	}
	else if (entState.repairable && entState.needsRepair)
	{
		resourceCarryingIcon.sprite = "stretched:session/icons/repair.png";
		resourceCarryingIcon.tooltip = getRepairTimeTooltip(entState);
		resourceCarryingText.caption = entState.repairable.numBuilders ?
			Engine.FormatMillisecondsIntoDateStringGMT(entState.repairable.buildTime.timeRemaining * 1000, translateWithContext("countdown format", "m:ss")) : "";
	}
	else
	{
		resourceCarryingIcon.hidden = true;
		resourceCarryingText.hidden = true;
	}

	Engine.GetGUIObjectByName("specific").caption = specificName;
	Engine.GetGUIObjectByName("player").caption = playerName;

	Engine.GetGUIObjectByName("playerColorBackground").sprite =
		"color:" + g_DiplomacyColors.getPlayerColor(entState.player, 128);

	Engine.GetGUIObjectByName("generic").caption = genericName == specificName ? "" :
		sprintf(translate("(%(genericName)s)"), {
			"genericName": genericName
		});

	let isGaia = playerState.civ == "gaia";
	Engine.GetGUIObjectByName("playerCivIcon").sprite = isGaia ? "" : "stretched:grayscale:" + civEmblem;
	Engine.GetGUIObjectByName("player").tooltip = isGaia ? "" : civName;

	// TODO: we should require all entities to have icons
	Engine.GetGUIObjectByName("icon").sprite = template.icon ? ("stretched:session/portraits/" + template.icon) : "BackgroundBlack";
	if (template.icon)
		Engine.GetGUIObjectByName("iconBorder").onPressRight = () => {
			showTemplateDetails(entState.template);
		};

	Engine.GetGUIObjectByName("attackAndResistanceStats").tooltip = [
		getAttackTooltip,
		getSplashDamageTooltip,
		getHealerTooltip,
		getResistanceTooltip,
		getGatherTooltip,
		getSpeedTooltip,
		getGarrisonTooltip,
		getProjectilesTooltip,
		getResourceTrickleTooltip,
		getLootTooltip
	].map(func => func(entState)).filter(tip => tip).join("\n");

	let iconTooltips = [];

	if (genericName)
		iconTooltips.push("[font=\"sans-bold-16\"]" + genericName + "[/font]");

	iconTooltips = iconTooltips.concat([
		getVisibleEntityClassesFormatted,
		getAurasTooltip,
		getEntityTooltip,
		showTemplateViewerOnRightClickTooltip
	].map(func => func(template)));

	Engine.GetGUIObjectByName("iconBorder").tooltip = iconTooltips.filter(tip => tip).join("\n");

	Engine.GetGUIObjectByName("detailsAreaSingle").hidden = false;
	Engine.GetGUIObjectByName("detailsAreaMultiple").hidden = true;
	Engine.GetGUIObjectByName("detailsAreaSingleMMO").hidden = true;
}

// Fills out information for multiple entities
function displayMultiple(entStates)
{
	let averageHealth = 0;
	let maxHealth = 0;
	let maxCapturePoints = 0;
	let capturePoints = (new Array(g_MaxPlayers + 1)).fill(0);
	let playerID = 0;
	let totalCarrying = {};
	let totalLoot = {};

	for (let entState of entStates)
	{
		playerID = entState.player; // trust that all selected entities have the same owner
		if (entState.hitpoints)
		{
			averageHealth += entState.hitpoints;
			maxHealth += entState.maxHitpoints;
		}
		if (entState.capturePoints)
		{
			maxCapturePoints += entState.maxCapturePoints;
			capturePoints = entState.capturePoints.map((v, i) => v + capturePoints[i]);
		}

		let carrying = calculateCarriedResources(
			entState.resourceCarrying || null,
			entState.trader && entState.trader.goods
		);

		if (entState.loot)
			for (let type in entState.loot)
				totalLoot[type] = (totalLoot[type] || 0) + entState.loot[type];

		for (let type in carrying)
		{
			totalCarrying[type] = (totalCarrying[type] || 0) + carrying[type];
			totalLoot[type] = (totalLoot[type] || 0) + carrying[type];
		}
	}

	Engine.GetGUIObjectByName("healthMultiple").hidden = averageHealth <= 0;
	if (averageHealth > 0)
	{
		let unitHealthBar = Engine.GetGUIObjectByName("healthBarMultiple");
		let healthSize = unitHealthBar.size;
		healthSize.rtop = 100 - 100 * Math.max(0, Math.min(1, averageHealth / maxHealth));
		unitHealthBar.size = healthSize;

		Engine.GetGUIObjectByName("healthMultiple").tooltip = getCurrentHealthTooltip({
			"hitpoints": averageHealth,
			"maxHitpoints": maxHealth
		});
	}

	Engine.GetGUIObjectByName("captureMultiple").hidden = maxCapturePoints <= 0;
	if (maxCapturePoints > 0)
	{
		let setCaptureBarPart = function(pID, startSize)
		{
			let unitCaptureBar = Engine.GetGUIObjectByName("captureBarMultiple[" + pID + "]");
			let sizeObj = unitCaptureBar.size;
			sizeObj.rtop = startSize;

			let size = 100 * Math.max(0, Math.min(1, capturePoints[pID] / maxCapturePoints));
			sizeObj.rbottom = startSize + size;
			unitCaptureBar.size = sizeObj;
			unitCaptureBar.sprite = "color:" + g_DiplomacyColors.getPlayerColor(pID, 128);
			unitCaptureBar.hidden = false;
			return startSize + size;
		};

		let size = 0;
		for (let i in capturePoints)
			if (i != playerID)
				size = setCaptureBarPart(i, size);

		// last handle the owner's points, to keep those points on the bottom for clarity
		setCaptureBarPart(playerID, size);

		Engine.GetGUIObjectByName("captureMultiple").tooltip = getCurrentHealthTooltip(
			{
				"hitpoints": capturePoints[playerID],
				"maxHitpoints": maxCapturePoints
			},
			translate("Capture Points:"));
	}

	let numberOfUnits = Engine.GetGUIObjectByName("numberOfUnits");
	numberOfUnits.caption = entStates.length;
	numberOfUnits.tooltip = "";

	if (Object.keys(totalCarrying).length)
		numberOfUnits.tooltip = sprintf(translate("%(label)s %(details)s\n"), {
			"label": headerFont(translate("Carrying:")),
			"details": bodyFont(Object.keys(totalCarrying).filter(
				res => totalCarrying[res] != 0).map(
				res => sprintf(translate("%(type)s %(amount)s"),
					{ "type": resourceIcon(res), "amount": totalCarrying[res] })).join("  "))
		});

	if (Object.keys(totalLoot).length)
		numberOfUnits.tooltip += sprintf(translate("%(label)s %(details)s"), {
			"label": headerFont(translate("Loot:")),
			"details": bodyFont(Object.keys(totalLoot).filter(
				res => totalLoot[res] != 0).map(
				res => sprintf(translate("%(type)s %(amount)s"),
					{ "type": resourceIcon(res), "amount": totalLoot[res] })).join("  "))
		});

	// Unhide Details Area
	Engine.GetGUIObjectByName("detailsAreaMultiple").hidden = false;
	Engine.GetGUIObjectByName("detailsAreaSingle").hidden = true;
	Engine.GetGUIObjectByName("detailsAreaSingleMMO").hidden = true;
}

// Updates middle entity Selection Details Panel and left Unit Commands Panel
function updateSelectionDetails()
{
	let supplementalDetailsPanel = Engine.GetGUIObjectByName("supplementalSelectionDetails");
	let detailsPanel = Engine.GetGUIObjectByName("selectionDetails");
	let detailsPanelMMO = Engine.GetGUIObjectByName("selectionDetailsMMO");
	let commandsPanel = Engine.GetGUIObjectByName("unitCommands");

	let entStates = [];

	for (let sel of g_Selection.toList())
	{
		let entState = GetEntityState(sel);
		if (!entState)
			continue;
		entStates.push(entState);
	}

	const nEntities = entStates.length;
	if (nEntities == 0)
	{
		Engine.GetGUIObjectByName("detailsAreaMultiple").hidden = true;
		Engine.GetGUIObjectByName("detailsAreaSingle").hidden = true;
		Engine.GetGUIObjectByName("detailsAreaSingleMMO").hidden = true;
		hideUnitCommands();

		supplementalDetailsPanel.hidden = true;
		detailsPanel.hidden = true;
		detailsPanelMMO.hidden = true;
		commandsPanel.hidden = true;
		return;
	}

	// Fill out general info and display it
	let isMMO = false;
	if (entStates.length == 1) {
		if (entStates[0].inventory) {
			isMMO = true;
			displaySingleMMO(entStates[0]);
		}
		else
			displaySingle(entStates[0]);
	}
	else {
		displayMultiple(entStates);
	}
	// Show basic details.
	if (isMMO) {
		detailsPanelMMO.hidden = false;
		detailsPanel.hidden = true;
	} else
		detailsPanel.hidden = false;

	if (isMMO)
		return;
	
	// Fill out commands panel for specific unit selected (or first unit of primary group)
	updateUnitCommands(entStates, supplementalDetailsPanel, commandsPanel);

	// Show health bar for garrisoned units if the garrison panel is visible
	if (Engine.GetGUIObjectByName("unitGarrisonPanel") && !Engine.GetGUIObjectByName("unitGarrisonPanel").hidden)
		updateGarrisonHealthBar(entStates[0], g_Selection.toList());
}

function tradingGainString(gain, owner)
{
	// Translation: Used in the trading gain tooltip
	return sprintf(translate("%(gain)s (%(player)s)"), {
		"gain": gain,
		"player": GetSimState().players[owner].name
	});
}

/**
 * Returns a message with the details of the trade gain.
 */
function getTradingTooltip(gain)
{
	if (!gain)
		return "";

	let markets = [
		{ "gain": gain.market1Gain, "owner": gain.market1Owner },
		{ "gain": gain.market2Gain, "owner": gain.market2Owner }
	];

	let primaryGain = gain.traderGain;

	for (let market of markets)
		if (market.gain && market.owner == gain.traderOwner)
			// Translation: Used in the trading gain tooltip to concatenate profits of different players
			primaryGain += translate("+") + market.gain;

	let tooltip = tradingGainString(primaryGain, gain.traderOwner);

	for (let market of markets)
		if (market.gain && market.owner != gain.traderOwner)
			tooltip +=
				translateWithContext("Separation mark in an enumeration", ", ") +
				tradingGainString(market.gain, market.owner);

	return tooltip;
}
