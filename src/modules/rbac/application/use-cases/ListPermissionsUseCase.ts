import { Permission } from "@/modules/rbac/domain/entities/Permission";
import { PermissionRepository } from "@/modules/rbac/application/ports/PermissionRepository";

export class ListPermissionsUseCase {
  constructor(private readonly permissionRepo: PermissionRepository) {}

  async execute(): Promise<Permission[]> {
    return this.permissionRepo.list();
  }
}
