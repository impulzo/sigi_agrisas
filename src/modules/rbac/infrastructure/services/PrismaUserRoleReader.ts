import { PrismaClient } from "@prisma/client";
import { UserRoleReader } from "@/modules/rbac/application/ports/UserRoleReader";

export class PrismaUserRoleReader implements UserRoleReader {
  constructor(private readonly prisma: PrismaClient) {}

  async listRoleNamesByUser(userId: string): Promise<string[]> {
    const rows = await this.prisma.userRole.findMany({
      where: { userId },
      include: { role: true },
    });
    return rows.map((r) => r.role.name);
  }
}
