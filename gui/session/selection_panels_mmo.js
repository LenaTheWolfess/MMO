g_SelectionPanels.Inventory = {
	"getMaxNumberOfItems": function()
	{
		return 24;
	},
	"getItems": function(unitEntStates)
	{
		if (unitEntStates.length > 1 || !unitEntStates[0].inventory)
			return [];
		return unitEntStates[0].inventory.items;
	},
	"rowLength": 3,
	"setupButton": function(data)
	{
		let entState = GetEntityState(data.item.id);
		let template = GetTemplateData(entState.template, data.player);
		if (!template)
			return false;
		let tooltips = [
			getEntityNamesFormatted,
			getVisibleEntityClassesFormatted,
			getAurasTooltip,
			getEntityTooltip
		].map(func => func(template));
		data.button.onPress = function() { unequipItem(data.item.id, data.playerState); };
		data.button.onPressRight = function() { dropItem(data.item.id, data.playerState); };
		data.button.tooltip = tooltips.join("\n");
		data.button.enabled = true;
		let modifier = "";
		if (template.icon)
			data.icon.sprite = modifier + "stretched:session/portraits/" + template.icon;
		let index = data.i + getNumberOfRightPanelButtons();
		setPanelObjectPosition(data.button, index, data.rowLength);
		
		return true;
	}
};
g_SelectionPanels.Bag = {
	"getMaxNumberOfItems": function()
	{
		return 24;
	},
	"getItems": function(unitEntStates)
	{
		if (unitEntStates.length > 1 || !unitEntStates[0].inventory)
			return [];
		return unitEntStates[0].inventory.bag;
	},
	"setupButton": function(data)
	{
		let entState = GetEntityState(data.item.id);
		if (entState == null)
			return false;
		let template = GetTemplateData(entState.template, data.player);
		if (!template)
			return false;
		let tooltips = [
			getEntityNamesFormatted,
			getVisibleEntityClassesFormatted,
			getAurasTooltip,
			getEntityTooltip
		].map(func => func(template));
		let usable = true;
		let rc = undefined;
		if (entState.equipment) {
			usable = entState.equipment.usable;
			rc = entState.equipment.category;
		}
		if (usable)
			data.button.onPress = function() { useItem(data.item.id, data.playerState); };
		else
			data.button.onPress = function() {};
		data.button.onPressRight = function() { dropItem(data.item.id, data.playerState); };
		data.button.enabled = true;
		let modifier = "";
		if (!usable) {
			modifier += "color: 100 0 0 127:grayscale:";
			tooltips.push("Required class: " + rc);
		}
		data.button.tooltip = tooltips.join("\n");
		if (template.icon)
			data.icon.sprite = modifier + "stretched:session/portraits/" + template.icon;
		let index = data.i + getNumberOfRightPanelButtons();
		setPanelObjectPosition(data.button, index, data.rowLength);
		
		return true;
	}
};