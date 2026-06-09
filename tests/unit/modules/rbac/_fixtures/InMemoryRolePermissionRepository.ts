import { Permission } from "@/modules/rbac/domain/entities/Permission";
import { RolePermissionRepository } from "@/modules/rbac/application/ports/RolePermissionRepository";
import { PermissionAlreadyGrantedError } from "@/modules/rbac/domain/errors/PermissionAlreadyGrantedError";
import { InMemoryPermissionRepository } from "./InMemoryPermissionRepository";

export class InMemoryRolePermissionRepository implements RolePermissionRepository {
  private grants = new Set<string>();

  constructor(private readonly permissionRepo: InMemoryPermissionRepository) {}

  private key(roleId: string, permissionId: string) { return `${roleId}:${permissionId}`; }

  async grant(roleId: string, permissionId: string): Promise<void> {
    const k = this.key(roleId, permissionId);
    if (this.grants.has(k)) throw new PermissionAlreadyGrantedError(roleId, permissionId);
    this.grants.add(k);
  }

  async revoke(roleId: string, permissionId: string): Promise<void> {
    this.grants.delete(this.key(roleId, permissionId));
  }

  async listByRole(roleId: string): Promise<Permission[]> {
    const perms: Permission[] = [];
    for (const k of this.grants) {
      const [rid, pid] = k.split(":");
      if (rid === roleId) {
        const perm = await this.permissionRepo.findById(pid);
        if (perm) perms.push(perm);
      }
    }
    return perms;
  }
}
