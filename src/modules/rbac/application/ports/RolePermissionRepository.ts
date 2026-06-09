import { Permission } from "@/modules/rbac/domain/entities/Permission";

export interface RolePermissionRepository {
  grant(roleId: string, permissionId: string): Promise<void>;
  revoke(roleId: string, permissionId: string): Promise<void>;
  listByRole(roleId: string): Promise<Permission[]>;
}
