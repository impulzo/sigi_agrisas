import { prisma } from "@/shared/infrastructure/prisma/client";
import { RolePrismaRepository } from "@/modules/rbac/infrastructure/repositories/RolePrismaRepository";
import { PermissionPrismaRepository } from "@/modules/rbac/infrastructure/repositories/PermissionPrismaRepository";
import { UserRolePrismaRepository } from "@/modules/rbac/infrastructure/repositories/UserRolePrismaRepository";
import { RolePermissionPrismaRepository } from "@/modules/rbac/infrastructure/repositories/RolePermissionPrismaRepository";
import { PrismaAuthorizationService } from "@/modules/rbac/infrastructure/services/PrismaAuthorizationService";
import { AssignRoleToUserUseCase } from "@/modules/rbac/application/use-cases/AssignRoleToUserUseCase";
import { RevokeRoleFromUserUseCase } from "@/modules/rbac/application/use-cases/RevokeRoleFromUserUseCase";
import { CheckUserPermissionUseCase } from "@/modules/rbac/application/use-cases/CheckUserPermissionUseCase";
import { randomUUID } from "crypto";

const TEST_USER_ID = randomUUID();
const TEST_EMAIL = `test_rbac_flow_${Date.now()}@test.local`;

afterAll(async () => {
  await prisma.userRole.deleteMany({ where: { userId: TEST_USER_ID } });
  await prisma.user.deleteMany({ where: { id: TEST_USER_ID } });
  await prisma.$disconnect();
});

describe("RBAC flow integration", () => {
  let authz: PrismaAuthorizationService;
  let assignUC: AssignRoleToUserUseCase;
  let revokeUC: RevokeRoleFromUserUseCase;
  let checkUC: CheckUserPermissionUseCase;

  beforeAll(async () => {
    await prisma.user.create({
      data: { id: TEST_USER_ID, email: TEST_EMAIL, passwordHash: "hash-test" },
    });
    const roleRepo = new RolePrismaRepository(prisma);
    const permRepo = new PermissionPrismaRepository(prisma);
    const userRoleRepo = new UserRolePrismaRepository(prisma);
    const rolePermRepo = new RolePermissionPrismaRepository(prisma);
    authz = new PrismaAuthorizationService(prisma, userRoleRepo);
    assignUC = new AssignRoleToUserUseCase(roleRepo, userRoleRepo, authz);
    revokeUC = new RevokeRoleFromUserUseCase(roleRepo, userRoleRepo, authz);
    checkUC = new CheckUserPermissionUseCase(authz);
  });

  it("asigna rol viewer y permite users:read", async () => {
    await assignUC.execute(TEST_USER_ID, "viewer");
    const can = await checkUC.execute(TEST_USER_ID, "users:read");
    expect(can).toBe(true);
  });

  it("viewer no puede roles:write", async () => {
    const can = await checkUC.execute(TEST_USER_ID, "roles:write");
    expect(can).toBe(false);
  });

  it("tras revocar viewer, ya no puede users:read", async () => {
    const viewerRole = await prisma.role.findUnique({ where: { name: "viewer" } });
    await revokeUC.execute(TEST_USER_ID, viewerRole!.id);
    const can = await checkUC.execute(TEST_USER_ID, "users:read");
    expect(can).toBe(false);
  });
});
