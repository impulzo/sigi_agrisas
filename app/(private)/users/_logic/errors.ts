export class UserNotFoundError extends Error {
  constructor() {
    super("User not found");
    this.name = "UserNotFoundError";
  }
}

export class EmailAlreadyInUseError extends Error {
  constructor() {
    super("Email already in use");
    this.name = "EmailAlreadyInUseError";
  }
}

export class SelfModificationError extends Error {
  action: "modify" | "delete";
  constructor(action: "modify" | "delete") {
    super(
      action === "modify"
        ? "Cannot modify your own account"
        : "Cannot delete your own account"
    );
    this.name = "SelfModificationError";
    this.action = action;
  }
}
