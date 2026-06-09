export class BranchInventoryRecordNotFoundError extends Error {
  constructor() {
    super("Inventory record not found");
    this.name = "BranchInventoryRecordNotFoundError";
  }
}
