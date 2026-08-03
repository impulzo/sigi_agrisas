export class PurchaseItemsEmptyError extends Error {
  constructor() {
    super("Purchase must include at least one item");
    this.name = "PurchaseItemsEmptyError";
  }
}
