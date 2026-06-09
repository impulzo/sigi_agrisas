import { Permission } from "@/modules/rbac/domain/entities/Permission";

export interface PermissionRepository {
  findById(id: string): Promise<Permission | null>;
  findByKey(key: string): Promise<Permission | null>;
  list(): Promise<Permission[]>;
  save(permission: Permission): Promise<void>;
}
