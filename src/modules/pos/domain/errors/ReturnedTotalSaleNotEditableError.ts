export class ReturnedTotalSaleNotEditableError extends Error {
  constructor() {
    super("SaleNotEditable");
    this.name = "ReturnedTotalSaleNotEditableError";
  }
}
