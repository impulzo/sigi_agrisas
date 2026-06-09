import { RoleRepository } from "@/modules/rbac/application/ports/RoleRepository";
import { UserRoleRepository } from "@/modules/rbac/application/ports/UserRoleRepository";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";
import { RoleNotFoundError } from "@/modules/rbac/domain/errors/RoleNotFoundError";

export class AssignRoleToUserUseCase {
  constructor(
    private readonly roleRepo: RoleRepository,
    private readonly userRoleRepo: UserRoleRepository,
    private readonly authzService: AuthorizationService
  ) {}

  async execute(userId: string, roleName: string): Promise<void> {
    const role = await this.roleRepo.findByName(roleName);
    if (!role) throw new RoleNotFoundError(roleName);

    await this.userRoleRepo.assign(userId, role.id);
    this.authzService.invalidate(userId);
  }
}
