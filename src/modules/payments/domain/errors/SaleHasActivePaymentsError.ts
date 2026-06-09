export class SaleHasActivePaymentsError extends Error {
  readonly paymentIds: string[];

  constructor(paymentIds: string[]) {
    super("Sale has active payments that must be cancelled first");
    this.name = "SaleHasActivePaymentsError";
    this.paymentIds = paymentIds;
  }
}
