import { PrismaClient } from "@prisma/client";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";
import { UserRoleRepository } from "@/modules/rbac/application/ports/UserRoleRepository";

const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  permissions: Set<string>;
  expiresAt: number;
}

export class PrismaAuthorizationService implements AuthorizationService {
  private readonly cache = new Map<string, CacheEntry>();

  constructor(
    private readonly prisma: PrismaClient,
    private readonly userRoleRepo: UserRoleRepository
  ) {}

  async userCan(userId: string, key: string): Promise<boolean> {
    const permissions = await this.getPermissions(userId);
    return permissions.has(key);
  }

  async listUserPermissions(userId: string): Promise<string[]> {
    const permissions = await this.getPermissions(userId);
    return Array.from(permissions);
  }

  invalidate(userId: string): void {
    this.cache.delete(userId);
  }

  async invalidateByRole(roleId: string): Promise<void> {
    const userIds = await this.userRoleRepo.listUsersOfRole(roleId);
    for (const userId of userIds) {
      this.cache.delete(userId);
    }
  }

  private async getPermissions(userId: string): Promise<Set<string>> {
    const cached = this.cache.get(userId);
    const now = Date.now();

    if (cached && cached.expiresAt > now) return cached.permissions;

    const permissions = await this.fetchUserPermissions(userId);
    this.cache.set(userId, { permissions, expiresAt: now + CACHE_TTL_MS });
    return permissions;
  }

  private async fetchUserPermissions(userId: string): Promise<Set<string>> {
    const rows = await this.prisma.$queryRaw<Array<{ key: string }>>`
      SELECT DISTINCT p.key
      FROM permissions p
      JOIN role_permissions rp ON rp.permission_id = p.id
      JOIN user_roles ur ON ur.role_id = rp.role_id
      WHERE ur.user_id = ${userId}::uuid
    `;
    return new Set(rows.map((r) => r.key));
  }
}
