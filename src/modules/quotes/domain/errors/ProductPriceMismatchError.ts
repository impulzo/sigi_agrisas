export class ProductPriceMismatchError extends Error {
  constructor() {
    super("Product price does not belong to product");
    this.name = "ProductPriceMismatchError";
  }
}
