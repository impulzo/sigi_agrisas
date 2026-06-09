export class CustomerHasNoCreditLineError extends Error {
  constructor() {
    super("Customer has no credit line (creditLimit is null)");
    this.name = "CustomerHasNoCreditLineError";
  }
}
