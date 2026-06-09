export class PaymentAlreadyCancelledError extends Error {
  constructor() {
    super("Payment is already cancelled");
    this.name = "PaymentAlreadyCancelledError";
  }
}
