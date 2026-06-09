import { PrismaClient } from "@prisma/client";
import { Role } from "@/modules/rbac/domain/entities/Role";
import { RoleRepository } from "@/modules/rbac/application/ports/RoleRepository";
import { RoleMapper } from "@/modules/rbac/application/mappers/RoleMapper";

export class RolePrismaRepository implements RoleRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findById(id: string): Promise<Role | null> {
    const raw = await this.prisma.role.findUnique({ where: { id } });
    return raw ? RoleMapper.toDomain(raw) : null;
  }

  async findByName(name: string): Promise<Role | null> {
    const raw = await this.prisma.role.findUnique({ where: { name } });
    return raw ? RoleMapper.toDomain(raw) : null;
  }

  async list(): Promise<Role[]> {
    const rows = await this.prisma.role.findMany({ orderBy: { name: "asc" } });
    return rows.map(RoleMapper.toDomain);
  }

  async save(role: Role): Promise<void> {
    await this.prisma.role.upsert({
      where: { id: role.id },
      update: { name: role.name, description: role.description ?? null },
      create: { id: role.id, name: role.name, description: role.description ?? null },
    });
  }
}
