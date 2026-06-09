export class InvalidPermissionKeyError extends Error {
  constructor(key: string) {
    super(`Invalid permission key: "${key}". Format must be resource:action`);
    this.name = "InvalidPermissionKeyError";
  }
}
