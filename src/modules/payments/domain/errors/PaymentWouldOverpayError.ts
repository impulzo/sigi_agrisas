export class PaymentWouldOverpayError extends Error {
  constructor() {
    super("Payment would cause customer balance to go below zero");
    this.name = "PaymentWouldOverpayError";
  }
}
