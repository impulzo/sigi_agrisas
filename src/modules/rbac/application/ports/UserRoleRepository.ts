import { Role } from "@/modules/rbac/domain/entities/Role";

export interface UserRoleRepository {
  assign(userId: string, roleId: string): Promise<void>;
  revoke(userId: string, roleId: string): Promise<void>;
  listByUser(userId: string): Promise<Role[]>;
  listUsersOfRole(roleId: string): Promise<string[]>;
}
