export class DosificationRequiresDefaultPriceError extends Error {
  constructor() {
    super("Dosification requires a default price");
    this.name = "DosificationRequiresDefaultPriceError";
  }
}
