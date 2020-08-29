Trigger.prototype.InitBossGame = function(msg)
{
	this.bosses = [];
	const cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
	for (let playerID = 0; playerID < TriggerHelper.GetNumberOfPlayers(); ++playerID) {
		const ents = cmpRangeManager.GetEntitiesByPlayer(playerID);
		for (let i in ents) {
			if (TriggerHelper.EntityMatchesClassList(ents[i], "Boss")) {
				this.bosses[playerID] = ents[i];
				break;
			}
		}
	}
};

Trigger.prototype.RenameBoss = function(data)
{
	let index = this.bosses.indexOf(data.entity);
	if (index != -1)
		this.bosses[index] = data.newentity;
};

Trigger.prototype.CheckBossDefeat = function(data)
{
	if (data.entity == this.bosses[data.from]) {
		const cmpRangeManager = Engine.QueryInterface(SYSTEM_ENTITY, IID_RangeManager);
		for (let playerID = 1; playerID < TriggerHelper.GetNumberOfPlayers(); ++playerID) {
			if (playerID != data.from)
				TriggerHelper.SetPlayerWon(
					playerID,
					n => markForTranslation("WIN"),
					""
				);
		}
	}
};

{
	let cmpTrigger = Engine.QueryInterface(SYSTEM_ENTITY, IID_Trigger);
	cmpTrigger.regicideHeroes = [];
	cmpTrigger.DoAfterDelay(0, "InitBossGame", {});
	cmpTrigger.RegisterTrigger("OnOwnershipChanged", "CheckBossDefeat", { "enabled": true });
	cmpTrigger.RegisterTrigger("OnEntityRenamed", "RenameBoss", { "enabled": true });
}
