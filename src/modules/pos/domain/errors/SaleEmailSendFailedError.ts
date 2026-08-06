export class SaleEmailSendFailedError extends Error {
  constructor(cause: unknown) {
    super("Failed to send ticket email");
    this.name = "SaleEmailSendFailedError";
    this.cause = cause;
  }
}
