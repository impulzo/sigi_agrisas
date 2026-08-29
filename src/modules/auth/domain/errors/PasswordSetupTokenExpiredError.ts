export class PasswordSetupTokenExpiredError extends Error {
  constructor() {
    super("Password setup token has expired");
    this.name = "PasswordSetupTokenExpiredError";
  }
}
