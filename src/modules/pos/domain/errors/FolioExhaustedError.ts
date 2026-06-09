export class FolioExhaustedError extends Error {
  constructor() {
    super("Folio is not available or has been exhausted");
    this.name = "FolioExhaustedError";
  }
}
