export class FolioCodeAlreadyInUseError extends Error {
  constructor() {
    super("Folio code already in use");
    this.name = "FolioCodeAlreadyInUseError";
  }
}
