export class PaymentMethodNotFoundError extends Error {
  constructor() {
    super("Payment method not found");
    this.name = "PaymentMethodNotFoundError";
  }
}
