function Inventory() {}

Inventory.prototype.Schema =
	"<element name='Type'>"+
		"<text/>" +
	"</element>";

Inventory.prototype.Init = function() {
	this.items = [];
}

Inventory.prototype.Use = function(id) {
	const cmpItem = Engine.QueryInterface(id, IID_Item);
	if (!cmpItem)
		return;
	cmpItem.Apply(this.entity);
	if (cmpItem.ShouldBeDestroyed())
		Engine.DestroyEntity(id);
}

Inventory.prototype.Add = function(id) {
	const cmpItem = Engine.QueryInterface(id, IID_Equipment);
	if (!cmpItem) {
		this.Use(id);
		return;
	}
	const type = cmpItem.GetType();
	const specific = cmpItem.GetTypeSpecific();
	const anim = cmpItem.GetAnimation();
	this.Drop(type);
	this.RemoveFrom(type);
	this.AddTo(id, type, specific, anim);
	this.Take(id);
}

Inventory.prototype.AddTo = function(id, type, specific, anim) {
	this.items[type] = id;
	const cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
	if (!cmpVisual)
		return;
	cmpVisual.SetVariant(type, anim);
	if (type == "weapon") {
		const n = "animations-"+specific+"-combat";
		cmpVisual.SetVariant("animations", n);
		if (this.items["cape"]) {
			const cmpCape = Engine.QueryInterface(this.items["cape"], IID_Equipment);
			if (cmpCape)
				cmpVisual.SetVariant("cape", "cape-"+cmpCape.GetTypeSpecific()+"-"+specific+"-combat")
		}
	}
	if (this.items["weapon"] && type == "cape") {
		const cmpWeapon = Engine.QueryInterface(this.items["weapon"], IID_Equipment);
		if (cmpWeapon) {
			const n = type+"-"+specific+"-"+cmpWeapon.GetTypeSpecific()+"-combat";
			cmpVisual.SetVariant(type, n);
		}
	} else if (type == "cape"){
		cmpVisual.SetVariant(type, "cape-"+specific+"-none");
	}
}

Inventory.prototype.RemoveBonus = function(id) {
	const cmpAura = Engine.QueryInterface(id, IID_Auras);
	if (cmpAura)
		cmpAura.RemoveFormationAura([this.entity]);
}

Inventory.prototype.AddBonus = function(id) {
	const cmpAura = Engine.QueryInterface(id, IID_Auras);
	if (cmpAura)
		cmpAura.ApplyFormationAura([this.entity]);
}

Inventory.prototype.RemoveFrom = function(type) {
	if (!type)
		return;
	const id = this.items[type];
	if (!id)
		return;
	this.RemoveBonus(id);
	this.items[type] = undefined;
	const cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
	if (!cmpVisual)
		return;
	// Item variant to show
	cmpVisual.SetVariant(type, type+"-none");
	if (type == "weapon") {
		cmpVisual.SetVariant("animations", "animations-none-relax");
		if (this.items["cape"]) {
			cmpVisual.SetVariant("cape", "cape-none");
		}
	}
}

Inventory.prototype.Take = function(id) {
	if (!id)
		return;
	this.AddBonus(id);
	const cmpPosition = Engine.QueryInterface(id, IID_Position);
	if (!cmpPosition)
		return;
	cmpPosition.MoveOutOfWorld();
}

Inventory.prototype.Drop = function(type) {
	const id = this.items[type];
	if (!id)
		return;
	const cmpPosition = Engine.QueryInterface(id, IID_Position);
	if (!cmpPosition)
		return;
	const cmpMyPosition = Engine.QueryInterface(this.entity, IID_Position);
	if (!cmpMyPosition)
		return;
	const pos = cmpMyPosition.GetPosition();
	cmpPosition.JumpTo(pos.x, pos.z);
	cmpPosition.SetHeightOffset(0);
}

Engine.RegisterComponentType(IID_Inventory, "Inventory", Inventory);
