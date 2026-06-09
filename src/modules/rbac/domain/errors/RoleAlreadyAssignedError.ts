export class RoleAlreadyAssignedError extends Error {
  constructor(userId: string, roleId: string) {
    super(`Role ${roleId} is already assigned to user ${userId}`);
    this.name = "RoleAlreadyAssignedError";
  }
}
