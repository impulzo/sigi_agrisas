export class EmptyReturnError extends Error {
  constructor() {
    super("Return must include at least one item");
    this.name = "EmptyReturnError";
  }
}
