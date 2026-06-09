export class RoleNotFoundError extends Error {
  constructor(identifier: string) {
    super(`Role not found: ${identifier}`);
    this.name = "RoleNotFoundError";
  }
}
