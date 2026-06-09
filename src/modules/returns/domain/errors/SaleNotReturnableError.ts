export class SaleNotReturnableError extends Error {
  readonly saleStatus: string;
  constructor(status: string) {
    super("Sale is not returnable");
    this.name = "SaleNotReturnableError";
    this.saleStatus = status;
  }
}
