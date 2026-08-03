export class PurchaseHasActiveProviderPaymentsError extends Error {
  readonly providerPaymentIds: string[];

  constructor(providerPaymentIds: string[]) {
    super("Purchase has active provider payments that must be cancelled first");
    this.name = "PurchaseHasActiveProviderPaymentsError";
    this.providerPaymentIds = providerPaymentIds;
  }
}
