export class SelfModificationError extends Error {
  constructor(action: "modify" | "delete" = "modify") {
    super(action === "delete" ? "Cannot delete your own account" : "Cannot modify your own account");
    this.name = "SelfModificationError";
  }
}
