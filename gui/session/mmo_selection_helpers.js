function dropItem(id)
{
	if (!id)
		return;
	Engine.PostNetworkCommand({
		"type": "drop",
		"entities": g_Selection.toList(),
		"item": id
	});	
}

function unequipItem(id)
{
	if (!id)
		return;
	Engine.PostNetworkCommand({
		"type": "un-equip",
		"entities": g_Selection.toList(),
		"item": id
	});	
}

function useItem(id)
{
	if (!id)
		return;
	Engine.PostNetworkCommand({
		"type": "use-item",
		"entities": g_Selection.toList(),
		"item": id
	});	
}