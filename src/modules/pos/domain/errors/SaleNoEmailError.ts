export class SaleNoEmailError extends Error {
  constructor() {
    super("Customer has no email and no override provided");
    this.name = "SaleNoEmailError";
  }
}
