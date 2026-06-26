import { prisma } from "@/shared/infrastructure/prisma/client";
import { UserPrismaRepository } from "@/modules/auth/infrastructure/repositories/UserPrismaRepository";
import { JwtTokenService } from "@/modules/auth/infrastructure/services/JwtTokenService";
import { BcryptPasswordHasher } from "@/modules/auth/infrastructure/services/BcryptPasswordHasher";
import { RegisterUseCase } from "@/modules/auth/application/use-cases/RegisterUseCase";
import { PrismaRoleAssigner } from "@/modules/rbac/infrastructure/services/PrismaRoleAssigner";
import { PrismaAuthorizationService } from "@/modules/rbac/infrastructure/services/PrismaAuthorizationService";
import { UserRolePrismaRepository } from "@/modules/rbac/infrastructure/repositories/UserRolePrismaRepository";

const TEST_EMAIL = `integration-test-${Date.now()}@example.com`;
let registeredUserId: string;

beforeAll(() => {
  process.env.RBAC_DEFAULT_ROLE = "viewer";
  process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "test-secret-32-chars-long-enough!";
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "test-refresh-32-chars-long-enou!";
});

afterAll(async () => {
  if (registeredUserId) {
    await prisma.userRole.deleteMany({ where: { userId: registeredUserId } });
    await prisma.user.deleteMany({ where: { id: registeredUserId } });
  }
  await prisma.$disconnect();
});

describe("Register con rol por defecto", () => {
  it("registrar usuario asigna rol viewer y se refleja en los permisos", async () => {
    const userRepo = new UserPrismaRepository(prisma);
    const tokenService = new JwtTokenService();
    const hasher = new BcryptPasswordHasher();
    const roleAssigner = new PrismaRoleAssigner(prisma);
    const registerUC = new RegisterUseCase(userRepo, hasher, tokenService, roleAssigner);

    const result = await registerUC.execute({
      name: "Integration User",
      email: TEST_EMAIL,
      password: "securepassword",
    });

    registeredUserId = result.user.id;

    expect(result.accessToken).toBeTruthy();

    const userRoleRepo = new UserRolePrismaRepository(prisma);
    const authz = new PrismaAuthorizationService(prisma, userRoleRepo);
    const canRead = await authz.userCan(registeredUserId, "users:read");
    expect(canRead).toBe(true);

    const canWrite = await authz.userCan(registeredUserId, "roles:write");
    expect(canWrite).toBe(false);
  });
});
