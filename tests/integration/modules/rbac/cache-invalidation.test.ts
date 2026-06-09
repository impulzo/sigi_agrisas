import { prisma } from "@/shared/infrastructure/prisma/client";
import { RolePrismaRepository } from "@/modules/rbac/infrastructure/repositories/RolePrismaRepository";
import { PermissionPrismaRepository } from "@/modules/rbac/infrastructure/repositories/PermissionPrismaRepository";
import { UserRolePrismaRepository } from "@/modules/rbac/infrastructure/repositories/UserRolePrismaRepository";
import { RolePermissionPrismaRepository } from "@/modules/rbac/infrastructure/repositories/RolePermissionPrismaRepository";
import { PrismaAuthorizationService } from "@/modules/rbac/infrastructure/services/PrismaAuthorizationService";
import { AssignRoleToUserUseCase } from "@/modules/rbac/application/use-cases/AssignRoleToUserUseCase";
import { GrantPermissionToRoleUseCase } from "@/modules/rbac/application/use-cases/GrantPermissionToRoleUseCase";
import { randomUUID } from "crypto";

const TEST_USER_ID = randomUUID();
const TEST_ROLE_NAME = `test_role_ci_${Date.now()}`;
const TEST_EMAIL = `test_cache_inv_${Date.now()}@test.local`;

beforeAll(async () => {
  await prisma.user.create({
    data: { id: TEST_USER_ID, email: TEST_EMAIL, passwordHash: "hash-test" },
  });
});

afterAll(async () => {
  await prisma.userRole.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
  await prisma.role.deleteMany({ where: { name: TEST_ROLE_NAME } });
  await prisma.$disconnect();
});

describe("RBAC cache invalidation", () => {
  it("tras GrantPermissionToRole, userCan refleja el cambio sin esperar TTL", async () => {
    const roleRepo = new RolePrismaRepository(prisma);
    const permRepo = new PermissionPrismaRepository(prisma);
    const userRoleRepo = new UserRolePrismaRepository(prisma);
    const rolePermRepo = new RolePermissionPrismaRepository(prisma);
    const authz = new PrismaAuthorizationService(prisma, userRoleRepo);
    const assignUC = new AssignRoleToUserUseCase(roleRepo, userRoleRepo, authz);
    const grantUC = new GrantPermissionToRoleUseCase(roleRepo, permRepo, rolePermRepo, authz);

    const role = await prisma.role.create({ data: { name: TEST_ROLE_NAME } });
    await userRoleRepo.assign(TEST_USER_ID, role.id);

    const canBefore = await authz.userCan(TEST_USER_ID, "users:read");
    expect(canBefore).toBe(false);

    const perm = await prisma.permission.findUnique({ where: { key: "users:read" } });
    await grantUC.execute(role.id, perm!.key);

    const canAfter = await authz.userCan(TEST_USER_ID, "users:read");
    expect(canAfter).toBe(true);
  });
});
