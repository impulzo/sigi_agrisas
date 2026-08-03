export class PurchaseAlreadyCancelledError extends Error {
  constructor() {
    super("Purchase is already cancelled");
    this.name = "PurchaseAlreadyCancelledError";
  }
}
