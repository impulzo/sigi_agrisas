export class SetPasswordEmailSendFailedError extends Error {
  constructor(cause: unknown) {
    super("Failed to send set-password email");
    this.name = "SetPasswordEmailSendFailedError";
    this.cause = cause;
  }
}
