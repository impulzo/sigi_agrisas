import { PrismaClient } from "@prisma/client";
import { Permission } from "@/modules/rbac/domain/entities/Permission";
import { RolePermissionRepository } from "@/modules/rbac/application/ports/RolePermissionRepository";
import { PermissionMapper } from "@/modules/rbac/application/mappers/PermissionMapper";
import { PermissionAlreadyGrantedError } from "@/modules/rbac/domain/errors/PermissionAlreadyGrantedError";
import { isPrismaUniqueError } from "@/shared/infrastructure/prisma/errors";

export class RolePermissionPrismaRepository implements RolePermissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async grant(roleId: string, permissionId: string): Promise<void> {
    try {
      await this.prisma.rolePermission.create({ data: { roleId, permissionId } });
    } catch (err: unknown) {
      if (isPrismaUniqueError(err)) {
        throw new PermissionAlreadyGrantedError(roleId, permissionId);
      }
      throw err;
    }
  }

  async revoke(roleId: string, permissionId: string): Promise<void> {
    await this.prisma.rolePermission.deleteMany({ where: { roleId, permissionId } });
  }

  async listByRole(roleId: string): Promise<Permission[]> {
    const rows = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: true },
    });
    return rows.map((r) => PermissionMapper.toDomain(r.permission));
  }
}
