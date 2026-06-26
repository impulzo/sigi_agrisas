export class ReturnedTotalSaleNotCancellableError extends Error {
  constructor() {
    super("SaleNotCancellable");
    this.name = "ReturnedTotalSaleNotCancellableError";
  }
}
