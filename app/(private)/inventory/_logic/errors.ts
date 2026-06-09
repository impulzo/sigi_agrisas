export class InventoryRecordNotFoundError extends Error {
  constructor() {
    super("Inventory record not found");
    this.name = "InventoryRecordNotFoundError";
  }
}

export class InventoryAlreadyExistsError extends Error {
  constructor() {
    super("Inventory record already exists for this branch and product");
    this.name = "InventoryAlreadyExistsError";
  }
}

export class NegativeStockNotAllowedError extends Error {
  constructor() {
    super("Negative stock not allowed");
    this.name = "NegativeStockNotAllowedError";
  }
}

export class InventoryTargetInvalidError extends Error {
  constructor(msg = "Branch or product not found or inactive") {
    super(msg);
    this.name = "InventoryTargetInvalidError";
  }
}
