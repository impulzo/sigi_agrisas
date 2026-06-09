import { RoleRepository } from "@/modules/rbac/application/ports/RoleRepository";
import { UserRoleRepository } from "@/modules/rbac/application/ports/UserRoleRepository";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";
import { RoleNotFoundError } from "@/modules/rbac/domain/errors/RoleNotFoundError";

export class RevokeRoleFromUserUseCase {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly userRoleRepo: UserRoleRepository,
    private readonly authzService: AuthorizationService
  ) {}

  async execute(userId: string, roleId: string): Promise<void> {
    const role = await this.roleRepo.findById(roleId);
    if (!role) throw new RoleNotFoundError(roleId);

    await this.userRoleRepo.revoke(userId, roleId);
    this.authzService.invalidate(userId);
  }
}
