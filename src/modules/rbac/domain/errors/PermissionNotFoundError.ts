export class PermissionNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Permission not found: ${identifier}`);
    this.name = "PermissionNotFoundError";
  }
}
