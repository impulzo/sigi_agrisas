export class SaleNotEditableHereError extends Error {
  constructor() {
    super("Sales can only be edited from the headquarters branch");
    this.name = "SaleNotEditableHereError";
  }
}
