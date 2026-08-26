export class ProductPriceBranchNotFoundError extends Error {
  constructor(branchId: string) {
    super(`Branch not found: ${branchId}`);
    this.name = "ProductPriceBranchNotFoundError";
  }
}
