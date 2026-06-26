import { PrismaAuthorizationService } from "@/modules/rbac/infrastructure/services/PrismaAuthorizationService";
import { UserRoleRepository } from "@/modules/rbac/application/ports/UserRoleRepository";

function makePrisma(keys: string[]) {
  return {
    $queryRaw: jest.fn().mockResolvedValue(keys.map((k) => ({ key: k }))),
  } as unknown as ConstructorParameters<typeof PrismaAuthorizationService>[0];
}

function makeUserRoleRepo(): UserRoleRepository {
  return {
    assign: jest.fn(),
    revoke: jest.fn(),
    listByUser: jest.fn().mockResolvedValue([]),
    listUsersOfRole: jest.fn().mockResolvedValue([]),
  };
}

describe("PrismaAuthorizationService — caché", () => {
  it("segunda llamada consecutiva usa caché (no llama a Prisma de nuevo)", async () => {
    const prisma = makePrisma(["users:read"]);
    const service = new PrismaAuthorizationService(prisma, makeUserRoleRepo());

    await service.userCan("user-1", "users:read");
    await service.userCan("user-1", "users:read");

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it("tras invalidar, la siguiente llamada consulta Prisma de nuevo", async () => {
    const prisma = makePrisma(["users:read"]);
    const service = new PrismaAuthorizationService(prisma, makeUserRoleRepo());

    await service.userCan("user-1", "users:read");
    service.invalidate("user-1");
    await service.userCan("user-1", "users:read");

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
  });

  it("tras expirar el TTL, la caché no se usa", async () => {
    jest.useFakeTimers();
    const prisma = makePrisma(["users:read"]);
    const service = new PrismaAuthorizationService(prisma, makeUserRoleRepo());

    await service.userCan("user-1", "users:read");
    jest.advanceTimersByTime(61_000);
    await service.userCan("user-1", "users:read");

    expect(prisma.$queryRaw).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});
