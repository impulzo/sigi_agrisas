export class BranchInventoryAlreadyExistsError extends Error {
  constructor() {
    super("Inventory record already exists for this branch and product");
    this.name = "BranchInventoryAlreadyExistsError";
  }
}
