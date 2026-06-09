export class QuoteAlreadyCancelledError extends Error {
  constructor() {
    super("Quote is already cancelled");
    this.name = "QuoteAlreadyCancelledError";
  }
}
