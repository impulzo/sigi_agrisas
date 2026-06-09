export class BranchCodeAlreadyInUseError extends Error {
  constructor() {
    super("Branch code already in use");
    this.name = "BranchCodeAlreadyInUseError";
  }
}
