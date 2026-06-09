export class ProductPriceNotFoundError extends Error {
  constructor(id: string) {
    super(`Product price not found: ${id}`);
    this.name = "ProductPriceNotFoundError";
  }
}
