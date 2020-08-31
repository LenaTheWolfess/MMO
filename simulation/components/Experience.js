  
function Experience() {}

Experience.prototype.Schema =
	"<element name='MaxLevel'>"+
		"<data type='positiveInteger'/>" +
	"</element>"+
	"<element name='RequiredXp'>" +
		"<data type='positiveInteger'/>" +
	"</element>";

Experience.prototype.Init = function()
{
	this.currentXp = 0;
	this.level = 0;
	this.modificationCache = new Map();
	this.modifications = new Map();
};

Experience.prototype.GetRequiredXp = function()
{
	return ApplyValueModificationsToEntity("Experience/RequiredXp", +this.template.RequiredXp, this.entity);
};

Experience.prototype.GetCurrentXp = function()
{
	return this.currentXp;
};

Experience.prototype.GetRank = function()
{
	switch (this.level)
	{
		case 1: return "Basic";
		case 2: return "Advanced";
		case 3: return "Elite";
		default: return "";
	}
}

Experience.prototype.GetLevel = function()
{
	return this.level;
}

Experience.prototype.GetRankExt = function()
{
	if ( this.level == 0 )
		return "bronze_1";
	else if ( this.level == 1 )
		return "iron_1";
	else if ( this.level == 2 )
		return "silver_1";
	else if ( this.level == 3 )
		return "gold_1";
	
	return "";
}

Experience.prototype.IsMaxLeveled = function()
{
	return this.level == +this.template.MaxLevel;
};

Experience.prototype.Advance = function()
{
	if(this.IsMaxLeveled())
		return;

	// If the unit is dead, don't advance
	let cmpCurrentUnitHealth = Engine.QueryInterface(this.entity, IID_Health);
	if (cmpCurrentUnitHealth.GetHitpoints() == 0)
		return;

	if (this.level < +this.template.MaxLevel)
		this.level++;

	this.LevelUp(this.level);
	this.RegisterXpChanged();
};

Experience.prototype.LevelUp = function(level)
{
	let modifiedComponents = {};
	let tech = "bonus_" + level;
	tech = "bonus_0_1";
	let template = ExperienceBonusTemplates.Get(tech);
	if (template.modifications)
	{
		let derivedModifiers = DeriveModificationsFromTech(template);
		for (let modifierPath in derivedModifiers)
		{
			if (!this.modifications[modifierPath])
				this.modifications[modifierPath] = [];
			this.modifications[modifierPath] = this.modifications[modifierPath].concat(derivedModifiers[modifierPath]);

			let component = modifierPath.split("/")[0];
			if (!modifiedComponents[component])
				modifiedComponents[component] = [];
			modifiedComponents[component].push(modifierPath);
			this.modificationCache[modifierPath] = {};
		}
	}
	for (let component in modifiedComponents)
		Engine.PostMessage(this.entity, MT_ValueModification, { "entities": [this.entity], "component": component, "valueNames": modifiedComponents[component]});
};

Experience.prototype.ApplyModifications = function(valueName, curValue)
{
	if (!this.modifications[valueName])
		return curValue;

	if (!this.modificationCache[valueName])
		this.modificationCache[valueName] = {};

	if (this.modificationCache[valueName].origValue === undefined || this.modificationCache[valueName].origValue != curValue)
	{
		let cmpIdentity = Engine.QueryInterface(this.entity, IID_Identity);
		if (!cmpIdentity)
			return curValue;

		this.modificationCache[valueName] = {
			"origValue": curValue,
			"newValue": GetTechModifiedProperty(this.modifications[valueName], cmpIdentity.GetClassesList(), curValue)
		};
	}
	return this.modificationCache[valueName].newValue;
};

Experience.prototype.IncreaseXp = function(amount)
{
	if (this.IsMaxLeveled())
		return;

	this.currentXp += +(amount);
	let requiredXp = this.GetRequiredXp();

	while (this.currentXp >= requiredXp)
	{
		this.currentXp -= requiredXp;
		this.Advance();
	}
};

Experience.prototype.OnValueModification = function(msg)
{
	if (msg.component == "Experience")
		this.IncreaseXp(0);
};

Experience.prototype.RegisterXpChanged = function()
{
	Engine.PostMessage(this.entity, MT_XpChanged, {});
};

Engine.RegisterComponentType(IID_Experience, "Experience", Experience);