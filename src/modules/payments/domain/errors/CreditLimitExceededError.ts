export class CreditLimitExceededError extends Error {
  readonly available: string;

  constructor(available: number) {
    super("Credit limit exceeded");
    this.name = "CreditLimitExceededError";
    this.available = available.toFixed(4);
  }
}
