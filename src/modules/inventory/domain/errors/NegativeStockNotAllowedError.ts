export class NegativeStockNotAllowedError extends Error {
  constructor() {
    super("Negative stock not allowed");
    this.name = "NegativeStockNotAllowedError";
  }
}
