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