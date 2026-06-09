export class PaymentExceedsDueAmountError extends Error {
  readonly due: string;

  constructor(due: number) {
    super("Payment amount exceeds the remaining due amount");
    this.name = "PaymentExceedsDueAmountError";
    this.due = due.toFixed(4);
  }
}
