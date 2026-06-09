export class SaleItemNotPartOfSaleError extends Error {
  readonly saleItemId: string;
  constructor(saleItemId: string) {
    super("Sale item does not belong to the linked sale");
    this.name = "SaleItemNotPartOfSaleError";
    this.saleItemId = saleItemId;
  }
}
