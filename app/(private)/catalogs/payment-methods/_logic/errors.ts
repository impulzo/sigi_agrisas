export class PaymentMethodNotFoundError extends Error {
  constructor() {
    super("Payment method not found");
    this.name = "PaymentMethodNotFoundError";
  }
}

export class PaymentMethodCodeAlreadyInUseError extends Error {
  constructor() {
    super("Payment method code already in use");
    this.name = "PaymentMethodCodeAlreadyInUseError";
  }
}
