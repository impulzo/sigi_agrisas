import { Role } from "@/modules/rbac/domain/entities/Role";

interface PrismaRole {
  id: string;
  name: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class RoleMapper {
  static toDomain(raw: PrismaRole): Role {
    return Role.create(raw.id, {
      name: raw.name,
      description: raw.description ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPlain(role: Role) {
    return {
      id: role.id,
      name: role.name,
      description: role.description,
      createdAt: role.createdAt,
      updatedAt: role.updatedAt,
    };
  }
}
