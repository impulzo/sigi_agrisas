export class PaymentItemsAmountMismatchError extends Error {
  readonly expected: string;
  readonly sum: string;

  constructor(expected: number, sum: number) {
    super("Sum of payment items amounts does not match the total payment amount");
    this.name = "PaymentItemsAmountMismatchError";
    this.expected = expected.toFixed(4);
    this.sum = sum.toFixed(4);
  }
}
