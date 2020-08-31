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

Abilities.prototype.abilitySchema = 
	"<interleave>" +
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
			"<element name='Damage'>" +
				"<data type='boolean'/>" +
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

Abilities.prototype.GetDelay = function(number)
{
	const ability = this.GetAbility(number);
	return +ability.Delay || 0;
}

Abilities.prototype.GetPostDelay = function(number)
{
	const ability = this.GetAbility(number);
	return +ability.PostDelay || 0;
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
		}
	}
	this.StartAnimation(data.number);
	this.StartTimer(data);
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
	this.timer = cmpTimer.SetTimeout(this.entity, IID_Abilities, "FinishAbility", +this.GetDuration(data.number) + this.GetPostDelay(data.number), data);
}

Abilities.prototype.FinishAbility = function(data)
{
	const number = data.number;
	warn("Abilities.FinishAbility " + number);
	
	const ability = this.GetAbility(number);
	if (ability.Damage && data.target) {
		//TODO: use custom function
		const type = "Melee";
		const cmpAttack = Engine.QueryInterface(this.entity, IID_Attack);
		if (cmpAttack && cmpAttack.CanAttack(data.target, [type]))
			cmpAttack.PerformAttack(type, data.target);
	}
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
Engine.RegisterComponentType(IID_Abilities, "Abilities", Abilities);