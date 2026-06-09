export class PaymentNotFoundError extends Error {
  constructor(id: string) {
    super(`Payment not found: ${id}`);
    this.name = "PaymentNotFoundError";
  }
}
