export class ProductPriceInvalidBranchError extends Error {
  constructor(branchId: string) {
    super(`Branch not found or inactive: ${branchId}`);
    this.name = "ProductPriceInvalidBranchError";
  }
}
