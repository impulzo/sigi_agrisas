import { randomUUID } from "crypto";
import { RoleRepository } from "@/modules/rbac/application/ports/RoleRepository";
import { Role } from "@/modules/rbac/domain/entities/Role";
import { RoleName } from "@/modules/rbac/domain/value-objects/RoleName";
import { RoleAlreadyExistsError } from "@/modules/rbac/domain/errors/RoleAlreadyExistsError";

interface CreateRoleInput {
  name: string;
  description?: string;
}

export class CreateRoleUseCase {
  constructor(private readonly roleRepo: RoleRepository) {}

  async execute({ name, description }: CreateRoleInput): Promise<Role> {
    const roleName = RoleName.create(name);

    const existing = await this.roleRepo.findByName(roleName.value);
    if (existing) throw new RoleAlreadyExistsError(roleName.value);

    const now = new Date();
    const role = Role.create(randomUUID(), {
      name: roleName.value,
      description,
      createdAt: now,
      updatedAt: now,
    });

    await this.roleRepo.save(role);

    return role;
  }
}
