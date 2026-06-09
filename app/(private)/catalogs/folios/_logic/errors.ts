export class FolioNotFoundError extends Error {
  constructor() {
    super("Folio not found");
    this.name = "FolioNotFoundError";
  }
}

export class FolioCodeAlreadyInUseError extends Error {
  constructor() {
    super("Folio code already in use");
    this.name = "FolioCodeAlreadyInUseError";
  }
}
