import { Role } from "@/modules/rbac/domain/entities/Role";
import { RoleRepository } from "@/modules/rbac/application/ports/RoleRepository";

export class ListRolesUseCase {
  constructor(private readonly roleRepo: RoleRepository) {}

  async execute(): Promise<Role[]> {
    return this.roleRepo.list();
  }
}
