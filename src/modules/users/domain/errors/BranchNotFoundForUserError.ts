export class BranchNotFoundForUserError extends Error {
  constructor() {
    super("Branch not found");
    this.name = "BranchNotFoundForUserError";
  }
}
