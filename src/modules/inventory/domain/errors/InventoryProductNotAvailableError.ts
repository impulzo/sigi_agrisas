export class InventoryProductNotAvailableError extends Error {
  constructor(productId: string) {
    super(`Product not found or inactive: ${productId}`);
    this.name = "InventoryProductNotAvailableError";
  }
}
