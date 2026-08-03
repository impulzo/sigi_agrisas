export class PurchaseNotPayableError extends Error {
  constructor() {
    super("Purchase is not a credit purchase and cannot receive provider payments");
    this.name = "PurchaseNotPayableError";
  }
}
