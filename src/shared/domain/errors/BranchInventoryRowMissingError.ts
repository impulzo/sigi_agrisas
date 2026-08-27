export class BranchInventoryRowMissingError extends Error {
  constructor(branchId: string, productId: string) {
    super(`No branch_inventory row for branch=${branchId} product=${productId} and allowRowCreation=false`);
    this.name = "BranchInventoryRowMissingError";
  }
}
