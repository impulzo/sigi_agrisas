export class ProductPriceNotAvailableForBranchError extends Error {
  constructor() {
    super("Product price does not belong to this branch");
    this.name = "ProductPriceNotAvailableForBranchError";
  }
}
