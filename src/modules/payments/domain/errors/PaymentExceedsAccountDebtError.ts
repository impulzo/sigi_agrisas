export class PaymentExceedsAccountDebtError extends Error {
  readonly due: string;

  constructor(due: number) {
    super("Payment amount exceeds the customer's account debt (non-ticketed balance)");
    this.name = "PaymentExceedsAccountDebtError";
    this.due = due.toFixed(4);
  }
}
