export class InventoryBranchNotFoundError extends Error {
  constructor(branchId: string) {
    super(`Branch not found: ${branchId}`);
    this.name = "InventoryBranchNotFoundError";
  }
}
