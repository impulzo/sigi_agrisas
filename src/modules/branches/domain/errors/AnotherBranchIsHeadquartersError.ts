export class AnotherBranchIsHeadquartersError extends Error {
  constructor() {
    super("Another branch is already marked as headquarters");
    this.name = "AnotherBranchIsHeadquartersError";
  }
}
