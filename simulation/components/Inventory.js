function Inventory() {}

Inventory.prototype.Schema =
	"<element name='Type'>"+
		"<text/>" +
	"</element>";

Inventory.prototype.Init = function() {
	this.items = [];
	this.bag = [];
	this.capacity = 24;
}

Inventory.prototype.UseItem = function(id) {
	const cmpItem = Engine.QueryInterface(id, IID_Item);
	if (!cmpItem)
		return;
	cmpItem.Apply(this.entity);
	if (cmpItem.ShouldBeDestroyed()) {
		Engine.DestroyEntity(id);
		const indx = this.bag.indexOf(id);
		if (indx != -1)
			this.bag[indx] = undefined;
	}
}

Inventory.prototype.Add = function(id) {
	let hasFreeRoom = this.HasFreeRoom();
	const cmpEquipment = Engine.QueryInterface(id, IID_Equipment);
	if (!cmpEquipment) {
		const cmpItem = Engine.QueryInterface(id, IID_Item);
		if (!hasFreeRoom || !cmpItem.CanBeStored())
			this.UseItem(id);
		else
			this.Take(id);
		return;
	}
	const type = cmpEquipment.GetType();
	const haveToRemove = !cmpEquipment.CanBeStored() && this.items[type];
	if (haveToRemove) {
		const idx = this.UnEquip(type);
		if (idx) {
			const cmpEquipmentX = Engine.QueryInterface(id, IID_Equipment);
			if (!hasFreeRoom || !cmpEquipmentX.CanBeStored()) {
				this.Drop(idx);
				hasFreeRoom = this.HasFreeRoom();
			}
		}
	}
	if (!hasFreeRoom) {
		warn("no place in inventory, nor can switch equipment");
		return;
	}
	this.Take(id);
	if (!this.items[type])
		this.Equip(id, type);
}

Inventory.prototype.Use = function(id) {
	if (!id)
		return;
	const cmpEquipment = Engine.QueryInterface(id, IID_Equipment);
	if (cmpEquipment) {
		this.SwitchEquipment(id, cmpEquipment.GetType());
		return;
	}
	this.UseItem(id);
}

Inventory.prototype.DropSafe = function(id) {
	if (!id)
		return;
	this.UnEquipSafe(id);
	this.Drop(id);
}

Inventory.prototype.UnEquipSafe = function(id) {
	if (!id)
		return;
	const cmpEquipment = Engine.QueryInterface(id, IID_Equipment);
	if (!cmpEquipment)
		return;
	const type = cmpEquipment.getType();
	if (!this.items[type] || this.items[type] != id)
		return;
	this.UnEquip(type);
}

Inventory.prototype.SwitchEquipment = function(id, type) {
	if (this.items[type] && this.items[type] != id) {
		const idx = this.UnEquip(type);
		const cmpEquipmentX = Engine.QueryInterface(id, IID_Equipment);
		if (!cmpEquipmentX.CanBeStored())
			this.Drop(idx);
	}
	this.Equip(id, type);
}

Inventory.prototype.Equip = function(id, type) {
	if (this.items[type])
		return;
	const cmpEquipment = Engine.QueryInterface(id, IID_Equipment);
	if (!cmpEquipment)
		return;
	this.items[type] = id;
	this.AddBonus(id);
	const cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
	if (!cmpVisual)
		return;
	const anim = cmpEquipment.GetAnimation();
	const specific = cmpEquipment.GetTypeSpecific();
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

Inventory.prototype.UnEquip = function(type) {
	if (!type)
		return;
	const id = this.items[type];
	if (!id)
		return;
	this.RemoveBonus(id);
	this.items[type] = undefined;
	const cmpVisual = Engine.QueryInterface(this.entity, IID_Visual);
	if (!cmpVisual)
		return id;
	// Item variant to show
	cmpVisual.SetVariant(type, type+"-none");
	if (type == "weapon") {
		cmpVisual.SetVariant("animations", "animations-none-relax");
		if (this.items["cape"]) {
			cmpVisual.SetVariant("cape", "cape-none");
		}
	}
	return id;
}

Inventory.prototype.Take = function(id) {
	if (!id)
		return;
	if (this.bag.indexOf(id) != -1)
		return;
	this.bag.push(id);
	const cmpPosition = Engine.QueryInterface(id, IID_Position);
	if (!cmpPosition)
		return;
	cmpPosition.MoveOutOfWorld();
}

Inventory.prototype.Drop = function(id) {
	if (!id)
		return;
	const indx = this.bag.indexOf(id);
	if (indx != -1)
		this.bag[indx] = undefined;
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

Inventory.prototype.GetItems = function() {
	let result = [];
	for (let type in this.items) {
		result.push({"id": this.items[type]});
	}
	return result;
}

Inventory.prototype.GetBag = function() {
	let result = [];
	for (let x in this.bag) {
		result.push({"id": this.bag[x]});
	}
	return result;
}

Inventory.prototype.HasFreeRoom = function() {
	return this.bag.length < this.capacity;
}

Engine.RegisterComponentType(IID_Inventory, "Inventory", Inventory);
