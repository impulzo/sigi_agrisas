export class PasswordNotSetError extends Error {
  constructor() {
    super("Account has no password set");
    this.name = "PasswordNotSetError";
  }
}
