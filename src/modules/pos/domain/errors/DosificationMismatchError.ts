export class DosificationMismatchError extends Error {
  constructor() {
    super("Dosification does not belong to product");
    this.name = "DosificationMismatchError";
  }
}
