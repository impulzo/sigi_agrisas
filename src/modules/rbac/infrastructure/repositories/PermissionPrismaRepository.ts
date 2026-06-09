import { PrismaClient } from "@prisma/client";
import { Permission } from "@/modules/rbac/domain/entities/Permission";
import { PermissionRepository } from "@/modules/rbac/application/ports/PermissionRepository";
import { PermissionMapper } from "@/modules/rbac/application/mappers/PermissionMapper";

export class PermissionPrismaRepository implements PermissionRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Permission | null> {
    const raw = await this.prisma.permission.findUnique({ where: { id } });
    return raw ? PermissionMapper.toDomain(raw) : null;
  }

  async findByKey(key: string): Promise<Permission | null> {
    const raw = await this.prisma.permission.findUnique({ where: { key } });
    return raw ? PermissionMapper.toDomain(raw) : null;
  }

  async list(): Promise<Permission[]> {
    const rows = await this.prisma.permission.findMany({ orderBy: { key: "asc" } });
    return rows.map(PermissionMapper.toDomain);
  }

  async save(permission: Permission): Promise<void> {
    await this.prisma.permission.upsert({
      where: { id: permission.id },
      update: { key: permission.key, description: permission.description ?? null },
      create: { id: permission.id, key: permission.key, description: permission.description ?? null },
    });
  }
}
