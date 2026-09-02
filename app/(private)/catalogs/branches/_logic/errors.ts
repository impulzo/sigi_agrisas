export class BranchNotFoundError extends Error {
  constructor() {
    super("Branch not found");
    this.name = "BranchNotFoundError";
  }
}

export class BranchCodeAlreadyInUseError extends Error {
  constructor() {
    super("Branch code already in use");
    this.name = "BranchCodeAlreadyInUseError";
  }
}
