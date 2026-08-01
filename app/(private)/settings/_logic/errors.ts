export class TicketLogoTooLargeError extends Error {
  constructor() { super("La imagen excede 2 MB."); this.name = "TicketLogoTooLargeError"; }
}

export class TicketLogoInvalidFormatError extends Error {
  constructor() { super("Formato no permitido. Usa JPG, PNG o WebP."); this.name = "TicketLogoInvalidFormatError"; }
}
