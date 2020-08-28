function Equipment() {}

Equipment.prototype.Schema = 
	"<element name='Cat'>"+
		"<text/>" +
	"</element>" +
	"<element name='Type'>"+
		"<text/>" +
	"</element>"+
	"<element name='TypeSpecific'>"+
		"<text/>" +
	"</element>"+
	"<element name='Animation'>"+
		"<text/>" +
	"</element>";

Equipment.prototype.Init = function()
{
}
Equipment.prototype.GetType = function()
{
	return this.template.Type;
}
Equipment.prototype.GetTypeSpecific = function()
{
	return this.template.TypeSpecific;
}
Equipment.prototype.GetAnimation = function()
{
	return this.template.Animation;
}
Equipment.prototype.GetCategory = function()
{
	return this.template.Cat;
}
Equipment.prototype.HasCategory = function(category)
{
	if (category == "all" || this.GetCategory() == "all")
		return true;
	return this.GetCategory() == category;
}
Equipment.prototype.CanBeStored = function()
{
	return true;
}
Engine.RegisterComponentType(IID_Equipment, "Equipment", Equipment);
