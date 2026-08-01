export class ProviderPaymentNotFoundError extends Error {
  constructor() {
    super("Provider payment not found");
    this.name = "ProviderPaymentNotFoundError";
  }
}
