export class PasswordSetupTokenInvalidError extends Error {
  constructor() {
    super("Invalid or already used password setup token");
    this.name = "PasswordSetupTokenInvalidError";
  }
}
