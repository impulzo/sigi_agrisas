export class ProductNotAvailableInBranchError extends Error {
  constructor() {
    super("Product is not available in this branch");
    this.name = "ProductNotAvailableInBranchError";
  }
}
