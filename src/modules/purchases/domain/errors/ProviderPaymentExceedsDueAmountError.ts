export class ProviderPaymentExceedsDueAmountError extends Error {
  readonly due: string;

  constructor(due: number) {
    super("Provider payment amount exceeds the remaining due amount");
    this.name = "ProviderPaymentExceedsDueAmountError";
    this.due = due.toFixed(4);
  }
}
