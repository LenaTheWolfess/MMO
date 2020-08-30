function Abilities () {}

Abilities.prototype.abilitySchema = 
	"<interleave>" +
		"<element name='AbilityName'>" +
			"<text/>" +
		"</element>" +
		"<element name='AnimationName'>" +
			"<text/>" +
		"</element>" +
		"<element name='Range'>" +
			"<ref name='nonNegativeDecimal'/>" +
		"</element>" +
		"<element name='Duration'>" +
			"<ref name='nonNegativeDecimal'/>" +
		"</element>" +
		"<optional>" +
			"<element name='Charge'>" +
				"<ref name='nonNegativeDecimal'/>" +
			"</element>" +
		"</optional>" +
		"<optional>" +
			"<element name='Damage'>" +
				"<data type='boolean'/>" +
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

Abilities.prototype.GetDuration = function(number)
{
	return this.GetAbility(number).Duration;
}

Abilities.prototype.GetAnimation = function(number)
{
	this.GetAbility(number).AnimationName;
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
		}
	}
	
	if (ability.Damage && data.target) {
		const cmpAttack = Engine.QueryInterface(this.entity, IID_Attack);
		if (cmpAttack && cmpAttack.CanAttack(data.target, ["Melee"]))
			cmpAttack.PerformAttack("Melee", data.target);
	}
	
	this.StartAnimation(number);
	this.StartTimer(number);
	return true;
}

Abilities.prototype.IsActive = function()
{
	return !!this.timer;
}

Abilities.prototype.StartTimer = function(number)
{
	const cmpTimer = Engine.QueryInterface(SYSTEM_ENTITY, IID_Timer);
	this.timer = cmpTimer.SetTimeout(this.entity, IID_Abilities, "FinishAbility", +this.GetDuration(number), number);
}

Abilities.prototype.FinishAbility = function(number)
{
	warn("Abilities.FinishAbility " + number);
	delete this.timer;
	const cmpUnitAI = Engine.QueryInterface(this.entity, IID_UnitAI);
	if (cmpUnitAI)
		cmpUnitAI.FinishAbility(number);
}

Abilities.prototype.StartAnimation = function(number)
{
	let cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
	if (!cmpVisual)
		return;

	cmpVisual.SelectAnimation(this.GetAnimation(number), true, +this.GetDuration(number));
}

Engine.RegisterComponentType(IID_Abilities, "Abilities", Abilities);