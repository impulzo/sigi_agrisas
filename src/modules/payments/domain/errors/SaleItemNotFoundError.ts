export class SaleItemNotFoundError extends Error {
  readonly saleItemId: string;

  constructor(saleItemId: string) {
    super("Sale item does not belong to this sale");
    this.name = "SaleItemNotFoundError";
    this.saleItemId = saleItemId;
  }
}
