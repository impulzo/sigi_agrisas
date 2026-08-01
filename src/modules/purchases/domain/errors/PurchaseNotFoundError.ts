export class PurchaseNotFoundError extends Error {
  constructor() {
    super("Purchase not found");
    this.name = "PurchaseNotFoundError";
  }
}
