export class BranchScopeViolationError extends Error {
  constructor() {
    super("Branch scope violation: sale belongs to a different branch");
    this.name = "BranchScopeViolationError";
  }
}
