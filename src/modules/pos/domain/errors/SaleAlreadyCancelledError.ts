export class SaleAlreadyCancelledError extends Error {
  constructor() {
    super("Sale is already cancelled");
    this.name = "SaleAlreadyCancelledError";
  }
}
