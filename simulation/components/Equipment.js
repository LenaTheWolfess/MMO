function Equipment() {}

Equipment.prototype.Schema = 
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
Equipment.prototype.CanBeStored = function()
{
	return true;
}
Engine.RegisterComponentType(IID_Equipment, "Equipment", Equipment);
