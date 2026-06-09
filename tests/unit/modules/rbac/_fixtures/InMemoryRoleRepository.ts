import { Role } from "@/modules/rbac/domain/entities/Role";
import { RoleRepository } from "@/modules/rbac/application/ports/RoleRepository";

export class InMemoryRoleRepository implements RoleRepository {
  private store = new Map<string, Role>();

  async findById(id: string): Promise<Role | null> {
    return this.store.get(id) ?? null;
  }

  async findByName(name: string): Promise<Role | null> {
    for (const role of this.store.values()) {
      if (role.name === name) return role;
    }
    return null;
  }

  async list(): Promise<Role[]> {
    return Array.from(this.store.values());
  }

  async save(role: Role): Promise<void> {
    this.store.set(role.id, role);
  }
}
