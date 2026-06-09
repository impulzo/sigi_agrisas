export class DuplicateDefaultPriceError extends Error {
  constructor() {
    super("Product already has a default price");
    this.name = "DuplicateDefaultPriceError";
  }
}
