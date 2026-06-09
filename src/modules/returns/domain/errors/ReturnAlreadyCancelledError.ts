export class ReturnAlreadyCancelledError extends Error {
  constructor() {
    super("Return is already cancelled");
    this.name = "ReturnAlreadyCancelledError";
  }
}
