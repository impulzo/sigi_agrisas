export class QuoteExpiredError extends Error {
  constructor() {
    super("Quote has expired");
    this.name = "QuoteExpiredError";
  }
}
