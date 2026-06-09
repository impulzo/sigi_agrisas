export class PermissionAlreadyGrantedError extends Error {
  constructor(roleId: string, permissionId: string) {
    super(`Permission ${permissionId} is already granted to role ${roleId}`);
    this.name = "PermissionAlreadyGrantedError";
  }
}
