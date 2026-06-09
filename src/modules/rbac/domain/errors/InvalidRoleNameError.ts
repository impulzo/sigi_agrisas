export class InvalidRoleNameError extends Error {
  constructor(name: string) {
    super(`Invalid role name: "${name}". Must match ^[a-z][a-z0-9_]{1,31}$`);
    this.name = "InvalidRoleNameError";
  }
}
