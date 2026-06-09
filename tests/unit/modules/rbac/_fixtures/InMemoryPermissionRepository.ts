import { Permission } from "@/modules/rbac/domain/entities/Permission";
import { PermissionRepository } from "@/modules/rbac/application/ports/PermissionRepository";

export class InMemoryPermissionRepository implements PermissionRepository {
  private store = new Map<string, Permission>();

  async findById(id: string): Promise<Permission | null> {
    return this.store.get(id) ?? null;
  }

  async findByKey(key: string): Promise<Permission | null> {
    for (const perm of this.store.values()) {
      if (perm.key === key) return perm;
    }
    return null;
  }

  async list(): Promise<Permission[]> {
    return Array.from(this.store.values());
  }

  async save(permission: Permission): Promise<void> {
    this.store.set(permission.id, permission);
  }
}
