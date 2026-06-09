export class PaymentMethodCodeAlreadyInUseError extends Error {
  constructor() {
    super("Payment method code already in use");
    this.name = "PaymentMethodCodeAlreadyInUseError";
  }
}
