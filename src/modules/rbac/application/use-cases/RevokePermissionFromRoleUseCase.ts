import { RoleRepository } from "@/modules/rbac/application/ports/RoleRepository";
import { PermissionRepository } from "@/modules/rbac/application/ports/PermissionRepository";
import { RolePermissionRepository } from "@/modules/rbac/application/ports/RolePermissionRepository";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";
import { RoleNotFoundError } from "@/modules/rbac/domain/errors/RoleNotFoundError";
import { PermissionNotFoundError } from "@/modules/rbac/domain/errors/PermissionNotFoundError";

export class RevokePermissionFromRoleUseCase {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly permissionRepo: PermissionRepository,
    private readonly rolePermissionRepo: RolePermissionRepository,
    private readonly authzService: AuthorizationService
  ) {}

  async execute(roleId: string, permissionId: string): Promise<void> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) throw new RoleNotFoundError(roleId);

    const permission = await this.permissionRepo.findById(permissionId);
    if (!permission) throw new PermissionNotFoundError(permissionId);

    await this.rolePermissionRepo.revoke(roleId, permissionId);
    await this.authzService.invalidateByRole(roleId);
  }
}
