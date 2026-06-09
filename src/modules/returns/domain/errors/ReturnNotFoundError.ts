export class ReturnNotFoundError extends Error {
  constructor() {
    super("Return not found");
    this.name = "ReturnNotFoundError";
  }
}
