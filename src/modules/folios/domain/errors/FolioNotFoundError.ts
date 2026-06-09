export class FolioNotFoundError extends Error {
  constructor() {
    super("Folio not found");
    this.name = "FolioNotFoundError";
  }
}
