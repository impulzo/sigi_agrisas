export class EmptyQuoteError extends Error {
  constructor() {
    super("Quote must include at least one item");
    this.name = "EmptyQuoteError";
  }
}
