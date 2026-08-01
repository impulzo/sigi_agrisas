export class ProductNotFoundOrInactiveError extends Error {
  constructor() {
    super("Product not found or inactive");
    this.name = "ProductNotFoundOrInactiveError";
  }
}
