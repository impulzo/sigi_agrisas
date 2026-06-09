import { PrismaClient } from "@prisma/client";
import { RoleAssigner } from "@/modules/rbac/application/ports/RoleAssigner";

export class PrismaRoleAssigner implements RoleAssigner {
  private readonly defaultRoleName: string;

  constructor(private readonly prisma: PrismaClient) {
    const roleName = process.env.RBAC_DEFAULT_ROLE;
    if (!roleName) {
      throw new Error("RBAC_DEFAULT_ROLE environment variable must be defined");
    }
    this.defaultRoleName = roleName;
  }

  async assignDefaultRole(userId: string): Promise<void> {
    const role = await this.prisma.role.findUnique({
      where: { name: this.defaultRoleName },
    });

    if (!role) {
      throw new Error(
        `Default role "${this.defaultRoleName}" not found. Run the seed script.`
      );
    }

    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      update: {},
      create: { userId, roleId: role.id },
    });
  }
}
