export class SaleAlreadyFullyReturnedError extends Error {
  constructor() {
    super("SaleAlreadyFullyReturned");
    this.name = "SaleAlreadyFullyReturnedError";
  }
}
