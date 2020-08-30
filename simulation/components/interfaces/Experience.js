Engine.RegisterInterface("Experience");

/**
 * Message of the form { "from": number, "to": number }
 * sent from Experience component whenever experience changes.
 */
Engine.RegisterMessageType("XpChanged");