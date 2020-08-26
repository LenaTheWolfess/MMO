function Item() {}

Item.prototype.Schema = 
	"<element name='Type'>"+
		"<text/>" +
	"</element>" + 
	"<element name='Affects'>" +
			"<zeroOrMore>" + 
				"<element>" +
				"<anyName/>" + 
					"<interleave>" + 
						"<element name='Component'>" +
							"<text/>" +
						"</element>" +
						"<element name='Fun'>" +
							"<text/>" +
						"</element>" +
						"<element name='Value'>" +
							"<data type='nonNegativeInteger'/>" +
						"</element>" +
					"</interleave>" +
				"</element>" +
			"</zeroOrMore>" +
	"</element>";

Item.prototype.Init = function()
{
}
Item.prototype.GetType = function()
{
	return this.template.Type;
}
Item.prototype.FilterComponent = function(str) {
	if (str == "Health")
		return IID_Health;
	return undefined;
}
Item.prototype.Apply = function(id) {
	for (let indx in this.template.Affects) {
		const affect = this.template.Affects[indx];
		const cmpId = this.FilterComponent(affect.Component);
		if (!cmpId)
			continue;
		const cmp = Engine.QueryInterface(id, cmpId);
		if (!cmp)
			continue;
		cmp[affect.Fun](+affect.Value);
	}
}
Item.prototype.ShouldBeDestroyed = function()
{
	return true;
}
Item.prototype.CanBeStored = function()
{
	return true;
}
Engine.RegisterComponentType(IID_Item, "Item", Item);
