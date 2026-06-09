import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";
import { InMemoryUserRoleRepository } from "./InMemoryUserRoleRepository";
import { InMemoryRolePermissionRepository } from "./InMemoryRolePermissionRepository";

export class InMemoryAuthorizationService implements AuthorizationService {
  constructor(
    private readonly userRoleRepo: InMemoryUserRoleRepository,
    private readonly rolePermRepo: InMemoryRolePermissionRepository
  ) {}

  async userCan(userId: string, key: string): Promise<boolean> {
    const perms = await this.listUserPermissions(userId);
    return perms.includes(key);
  }

  async listUserPermissions(userId: string): Promise<string[]> {
    const roles = await this.userRoleRepo.listByUser(userId);
    const permSet = new Set<string>();
    for (const role of roles) {
      const perms = await this.rolePermRepo.listByRole(role.id);
      for (const p of perms) permSet.add(p.key);
    }
    return Array.from(permSet);
  }

  invalidate(_userId: string): void {}

  async invalidateByRole(_roleId: string): Promise<void> {}
}
