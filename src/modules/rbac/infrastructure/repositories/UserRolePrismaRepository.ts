import { PrismaClient } from "@prisma/client";
import { Role } from "@/modules/rbac/domain/entities/Role";
import { UserRoleRepository } from "@/modules/rbac/application/ports/UserRoleRepository";
import { RoleMapper } from "@/modules/rbac/application/mappers/RoleMapper";
import { RoleAlreadyAssignedError } from "@/modules/rbac/domain/errors/RoleAlreadyAssignedError";

export class UserRolePrismaRepository implements UserRoleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async assign(userId: string, roleId: string): Promise<void> {
    try {
      await this.prisma.userRole.create({ data: { userId, roleId } });
    } catch (err: unknown) {
      if (isPrismaUniqueError(err)) {
        throw new RoleAlreadyAssignedError(userId, roleId);
      }
      throw err;
    }
  }

  async revoke(userId: string, roleId: string): Promise<void> {
    await this.prisma.userRole.deleteMany({ where: { userId, roleId } });
  }

  async listByUser(userId: string): Promise<Role[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return rows.map((r) => RoleMapper.toDomain(r.role));
  }

  async listUsersOfRole(roleId: string): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({ where: { roleId } });
    return rows.map((r) => r.userId);
  }
}

function isPrismaUniqueError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: string }).code === "P2002"
  );
}
