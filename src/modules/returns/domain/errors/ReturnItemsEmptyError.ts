export class ReturnItemsEmptyError extends Error {
  constructor() {
    super("Return must include at least one item");
    this.name = "ReturnItemsEmptyError";
  }
}
