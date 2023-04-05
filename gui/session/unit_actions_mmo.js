g_UnitActions["ability"] = {
	"execute": function(target, action, selection, queued)
	{
		Engine.PostNetworkCommand({
			"type": "ability",
			"entities": selection,
			"target": action.target,
			"number": action.number,
			"queued": queued
		});

		Engine.GuiInterfaceCall("PlaySound", {
			"name": "order_attack",
			"entity": selection[0]
		});

		return true;
	},
	"getActionInfo": function(entState, targetState)
	{
		return {
			"possible": true
		};
	},
	"hotkeyActionCheck": function(target, selection)
	{
		if (!getActionInfo("ability", target, selection).possible)
			return false;
		let number = -1;
		for (let n = 1; n < 6; ++n) {
			if (Engine.HotkeyIsPressed("session.ability."+n)) {
				number = n;
				break;
			}
		}
		if (number == -1)
			return false;
		return {
			"type": "ability",
			"number": number,
			"cursor": "action-attack",
			"target": target
		};
	},
	"actionCheck": function(target, selection)
	{
		return false;
	},
	"specificness": 1,
};
g_UnitActions["pick"] = {
	"execute": function(target, action, selection, queued) {							
		Engine.PostNetworkCommand({
			"type": "pick",
			"entities": selection,
			"target": action.target,
			"queued": queued
		});

		Engine.GuiInterfaceCall("PlaySound", {
			"name": "order_gather",
			"entity": selection[0]
		});

		return true;
	},
	"getActionInfo": function(entState, targetState) {
		if (!targetState || !targetState.equipment) 
			return false;

		return {
			"possible": true,
			"cursor": "action-gather-treasure"
		};
	},
	"actionCheck": function(target, selection) {
		const actionInfo = getActionInfo("pick", target, selection);

		if (!actionInfo.possible)										
			return false;

		return {
			"type": "pick",
			"cursor": actionInfo.cursor,
			"target": target
		};
	},
	"specificness": 1,
};

g_UnitActions["pick-use"] = {
	"execute": function(target, action, selection, queued) {
		Engine.PostNetworkCommand({
			"type": "pick-use",
			"entities": selection,
			"target": action.target,
			"queued": queued
		});

		Engine.GuiInterfaceCall("PlaySound", {
			"name": "order_gather",
			"entity": selection[0]
		});

		return true;
	},
	"getActionInfo": function(entState, targetState) {
		if (!targetState || !targetState.item)
			return false;

		return {
			"possible": true,
			"cursor": "action-gather-treasure"
		};
	},
	"actionCheck": function(target, selection) {
		const actionInfo = getActionInfo("pick-use", target, selection);

		if (!actionInfo.possible)
			return false;

		return {
			"type": "pick-use",
			"cursor": actionInfo.cursor,
			"target": target
		};
	},
	"specificness": 1,
};
