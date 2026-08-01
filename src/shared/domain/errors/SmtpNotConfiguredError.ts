export class SmtpNotConfiguredError extends Error {
  constructor() {
    super("SMTP is not configured (SMTP_HOST missing)");
    this.name = "SmtpNotConfiguredError";
  }
}
