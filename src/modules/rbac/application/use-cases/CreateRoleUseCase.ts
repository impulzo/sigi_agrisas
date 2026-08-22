import { randomUUID } from "crypto";
import { RoleRepository } from "@/modules/rbac/application/ports/RoleRepository";
import { Role } from "@/modules/rbac/domain/entities/Role";
import { RoleName } from "@/modules/rbac/domain/value-objects/RoleName";
import { RoleAlreadyExistsError } from "@/modules/rbac/domain/errors/RoleAlreadyExistsError";

interface CreateRoleInput {
  name: string;
  description?: string;
}

const PRISMA_UNIQUE_CONSTRAINT_CODE = "P2002";

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

    try {
      await this.roleRepo.save(role);
    } catch (err) {
      if (this.isUniqueConstraintError(err)) {
        throw new RoleAlreadyExistsError(roleName.value);
      }
      throw err;
    }

    return role;
  }

  private isUniqueConstraintError(err: unknown): boolean {
    return (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: unknown }).code === PRISMA_UNIQUE_CONSTRAINT_CODE
    );
  }
}
