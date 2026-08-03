export class PaymentExceedsLineDueAmountError extends Error {
  readonly saleItemId: string;
  readonly due: string;

  constructor(saleItemId: string, due: number) {
    super("Payment line amount exceeds the remaining due amount for that sale item");
    this.name = "PaymentExceedsLineDueAmountError";
    this.saleItemId = saleItemId;
    this.due = due.toFixed(4);
  }
}
