GameSettingControls.LockedTeams = class extends GameSettingControlCheckbox
{
	onMapChange(mapData)
	{
		let mapValue;
		if (mapData &&
			mapData.settings &&
			mapData.settings.LockTeams !== undefined)
			mapValue = mapData.settings.LockTeams;

		this.setEnabled(mapValue === undefined);
		if (mapValue === undefined || mapValue == g_GameAttributes.settings.LockTeams)
			return;
		
		g_GameAttributes.settings.LockTeams = mapValue;
		
		this.gameSettingsControl.updateGameAttributes();
		
	}

	onGameAttributesChange()
	{
		if (!g_GameAttributes.mapType)
			return;

		if (g_GameAttributes.settings.LockTeams === undefined)
		{
			g_GameAttributes.settings.LockTeams = g_IsNetworked;
			this.gameSettingsControl.updateGameAttributes();
		}
	}

	onGameAttributesBatchChange()
	{
		if (!g_GameAttributes.mapType)
			return;

		this.setChecked(g_GameAttributes.settings.LockTeams);
	}

	onPress(checked)
	{
		g_GameAttributes.settings.LockTeams = checked;
		this.gameSettingsControl.updateGameAttributes();
		this.gameSettingsControl.setNetworkGameAttributes();
	}
};

GameSettingControls.LockedTeams.prototype.TitleCaption =
	translate("Teams Locked");

GameSettingControls.LockedTeams.prototype.Tooltip =
	translate("Toggle locked teams.");

/**
 * In multiplayer mode, players negotiate teams before starting the match and
 * expect to play the match with these teams unless explicitly stated otherwise during the match settings.
 * For singleplayermode, preserve the historic default of open diplomacies.
 */
GameSettingControls.LockedTeams.prototype.DefaultValue = Engine.HasNetClient();
