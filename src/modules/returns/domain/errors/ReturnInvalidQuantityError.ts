export class ReturnInvalidQuantityError extends Error {
  readonly saleItemId: string;
  readonly quantity: number;
  constructor(saleItemId: string, quantity: number) {
    super(`Return quantity must be > 0, got ${quantity} for saleItemId ${saleItemId}`);
    this.name = "ReturnInvalidQuantityError";
    this.saleItemId = saleItemId;
    this.quantity = quantity;
  }
}
