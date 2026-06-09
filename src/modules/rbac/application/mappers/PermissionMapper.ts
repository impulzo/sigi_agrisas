import { Permission } from "@/modules/rbac/domain/entities/Permission";

interface PrismaPermission {
  id: string;
  key: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class PermissionMapper {
  static toDomain(raw: PrismaPermission): Permission {
    return Permission.create(raw.id, {
      key: raw.key,
      description: raw.description ?? undefined,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPlain(permission: Permission) {
    return {
      id: permission.id,
      key: permission.key,
      description: permission.description,
      createdAt: permission.createdAt,
      updatedAt: permission.updatedAt,
    };
  }
}
