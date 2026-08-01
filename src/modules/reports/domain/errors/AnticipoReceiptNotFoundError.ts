export class AnticipoReceiptNotFoundError extends Error {
  constructor(paymentId: string) {
    super(`Payment ${paymentId} not found for this customer`);
    this.name = "AnticipoReceiptNotFoundError";
  }
}
