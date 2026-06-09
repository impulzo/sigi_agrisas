export class CancelledSaleNotEditableError extends Error {
  constructor() {
    super("Cancelled sales cannot be edited");
    this.name = "CancelledSaleNotEditableError";
  }
}
