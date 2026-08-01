export class ProviderPaymentAlreadyCancelledError extends Error {
  constructor() {
    super("Provider payment is already cancelled");
    this.name = "ProviderPaymentAlreadyCancelledError";
  }
}
