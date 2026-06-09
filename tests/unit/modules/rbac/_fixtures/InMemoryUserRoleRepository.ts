import { Role } from "@/modules/rbac/domain/entities/Role";
import { UserRoleRepository } from "@/modules/rbac/application/ports/UserRoleRepository";
import { RoleAlreadyAssignedError } from "@/modules/rbac/domain/errors/RoleAlreadyAssignedError";
import { InMemoryRoleRepository } from "./InMemoryRoleRepository";

export class InMemoryUserRoleRepository implements UserRoleRepository {
  private assignments = new Set<string>();

  constructor(private readonly roleRepo: InMemoryRoleRepository) {}

  private key(userId: string, roleId: string) { return `${userId}:${roleId}`; }

  async assign(userId: string, roleId: string): Promise<void> {
    const k = this.key(userId, roleId);
    if (this.assignments.has(k)) throw new RoleAlreadyAssignedError(userId, roleId);
    this.assignments.add(k);
  }

  async revoke(userId: string, roleId: string): Promise<void> {
    this.assignments.delete(this.key(userId, roleId));
  }

  async listByUser(userId: string): Promise<Role[]> {
    const roles: Role[] = [];
    for (const k of this.assignments) {
      const [uid, rid] = k.split(":");
      if (uid === userId) {
        const role = await this.roleRepo.findById(rid);
        if (role) roles.push(role);
      }
    }
    return roles;
  }

  async listUsersOfRole(roleId: string): Promise<string[]> {
    const users: string[] = [];
    for (const k of this.assignments) {
      const [uid, rid] = k.split(":");
      if (rid === roleId) users.push(uid);
    }
    return users;
  }
}
