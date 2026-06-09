import { RoleRepository } from "@/modules/rbac/application/ports/RoleRepository";
import { PermissionRepository } from "@/modules/rbac/application/ports/PermissionRepository";
import { RolePermissionRepository } from "@/modules/rbac/application/ports/RolePermissionRepository";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";
import { RoleNotFoundError } from "@/modules/rbac/domain/errors/RoleNotFoundError";
import { PermissionNotFoundError } from "@/modules/rbac/domain/errors/PermissionNotFoundError";

export class GrantPermissionToRoleUseCase {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly permissionRepo: PermissionRepository,
    private readonly rolePermissionRepo: RolePermissionRepository,
    private readonly authzService: AuthorizationService
  ) {}

  async execute(roleId: string, permissionKey: string): Promise<void> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) throw new RoleNotFoundError(roleId);

    const permission = await this.permissionRepo.findByKey(permissionKey);
    if (!permission) throw new PermissionNotFoundError(permissionKey);

    await this.rolePermissionRepo.grant(roleId, permission.id);
    await this.authzService.invalidateByRole(roleId);
  }
}
