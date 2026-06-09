import { Role } from "@/modules/rbac/domain/entities/Role";

export interface RoleRepository {
  findById(id: string): Promise<Role | null>;
  findByName(name: string): Promise<Role | null>;
  list(): Promise<Role[]>;
  save(role: Role): Promise<void>;
}
