import { PrismaClient } from "@prisma/client";
import {
  AdminUserRepository,
  AdminUserCreateData,
  AdminUserUpdateData,
} from "@/modules/users/application/ports/AdminUserRepository";
import { AdminUser } from "@/modules/users/domain/entities/AdminUser";
import { UserNotFoundError } from "@/modules/users/domain/errors/UserNotFoundError";
import { EmailAlreadyInUseError } from "@/modules/users/domain/errors/EmailAlreadyInUseError";
import { RoleNotFoundError } from "@/modules/rbac/domain/errors/RoleNotFoundError";
import { resolveAvatarUrl } from "@/modules/users/domain/utils/avatarUrl";

type PrismaUserWithRoles = {
  id: string;
  name: string | null;
  email: string;
  avatarUrl: string | null;
  branchId: string | null;
  branch: { name: string } | null;
  createdAt: Date;
  updatedAt: Date;
  roles: { role: { name: string } }[];
};

function toAdminUser(u: PrismaUserWithRoles): AdminUser {
  return AdminUser.create(u.id, {
    name: u.name ?? undefined,
    email: u.email,
    avatarUrl: resolveAvatarUrl(u.email, u.avatarUrl),
    branchId: u.branchId,
    branchName: u.branch?.name ?? null,
    roles: u.roles.map((r) => r.role.name),
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  });
}

function isPrismaUniqueError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

function isPrismaNotFoundError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2025";
}

function isPrismaFkConstraintError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2003";
}

const include = {
  roles: { include: { role: true } },
  branch: { select: { name: true } },
} as const;

export class PrismaAdminUserRepository implements AdminUserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll({ page, pageSize }: { page: number; pageSize: number }): Promise<{ users: AdminUser[]; total: number }> {
    const skip = (page - 1) * pageSize;
    const [rows, total] = await Promise.all([
      this.prisma.user.findMany({ skip, take: pageSize, include, orderBy: { createdAt: "desc" } }),
      this.prisma.user.count(),
    ]);
    return { users: rows.map(toAdminUser), total };
  }

  async findById(id: string): Promise<AdminUser | null> {
    const row = await this.prisma.user.findUnique({ where: { id }, include });
    return row ? toAdminUser(row) : null;
  }

  async create(data: AdminUserCreateData): Promise<AdminUser> {
    try {
      const row = await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            name: data.name,
            email: data.email,
            passwordHash: data.passwordHash,
            avatarUrl: data.avatarUrl ?? null,
            branchId: data.branchId ?? null,
          },
        });
        if (data.roleIds && data.roleIds.length > 0) {
          await tx.userRole.createMany({
            data: data.roleIds.map((roleId) => ({ userId: created.id, roleId })),
          });
        }
        return tx.user.findUniqueOrThrow({ where: { id: created.id }, include });
      });
      return toAdminUser(row);
    } catch (err) {
      if (isPrismaUniqueError(err)) throw new EmailAlreadyInUseError();
      if (isPrismaFkConstraintError(err)) throw new RoleNotFoundError("one or more roleIds");
      throw err;
    }
  }

  async update(id: string, data: AdminUserUpdateData): Promise<AdminUser> {
    try {
      const row = await this.prisma.user.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.email !== undefined ? { email: data.email } : {}),
          ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
          ...(data.branchId !== undefined ? { branchId: data.branchId } : {}),
        },
        include,
      });
      return toAdminUser(row);
    } catch (err) {
      if (isPrismaUniqueError(err)) throw new EmailAlreadyInUseError();
      if (isPrismaNotFoundError(err)) throw new UserNotFoundError();
      throw err;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (err) {
      if (isPrismaNotFoundError(err)) throw new UserNotFoundError();
      throw err;
    }
  }
}

export { isPrismaFkConstraintError };
