import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaAdminUserRepository } from "@/modules/users/infrastructure/repositories/PrismaAdminUserRepository";
import { ListUsersUseCase } from "@/modules/users/application/use-cases/ListUsersUseCase";
import { GetUserUseCase } from "@/modules/users/application/use-cases/GetUserUseCase";
import { UpdateUserUseCase } from "@/modules/users/application/use-cases/UpdateUserUseCase";
import { DeleteUserUseCase } from "@/modules/users/application/use-cases/DeleteUserUseCase";
import { UserNotFoundError } from "@/modules/users/domain/errors/UserNotFoundError";
import { SelfModificationError } from "@/modules/users/domain/errors/SelfModificationError";
import { PrismaBranchRepository } from "@/modules/branches/infrastructure/repositories/PrismaBranchRepository";
import { randomUUID } from "crypto";

const TEST_ID = randomUUID();
const TEST_EMAIL = `test_admin_crud_${Date.now()}@test.local`;

beforeAll(async () => {
  await prisma.user.create({ data: { id: TEST_ID, email: TEST_EMAIL, passwordHash: "hash-test" } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: TEST_ID } });
  await prisma.$disconnect();
});

describe("Admin users CRUD integration", () => {
  const repo = new PrismaAdminUserRepository(prisma);
  const branchRepo = new PrismaBranchRepository(prisma);

  it("findAll incluye el usuario de prueba", async () => {
    const useCase = new ListUsersUseCase(repo);
    const result = await useCase.execute({ page: 1, pageSize: 100 });
    expect(result.total).toBeGreaterThanOrEqual(1);
    expect(result.users.some((u) => u.id === TEST_ID)).toBe(true);
  });

  it("findById devuelve el usuario correcto", async () => {
    const useCase = new GetUserUseCase(repo);
    const user = await useCase.execute(TEST_ID);
    expect(user.email).toBe(TEST_EMAIL);
  });

  it("findById lanza UserNotFoundError si no existe", async () => {
    await expect(new GetUserUseCase(repo).execute(randomUUID())).rejects.toThrow(UserNotFoundError);
  });

  it("findById devuelve avatarUrl como Gravatar cuando no hay valor almacenado", async () => {
    const user = await new GetUserUseCase(repo).execute(TEST_ID);
    expect(user.avatarUrl).toMatch(/^https:\/\/www\.gravatar\.com\/avatar\/[a-f0-9]{32}\?d=mp&s=200$/);
  });

  it("update modifica el nombre", async () => {
    const useCase = new UpdateUserUseCase(repo, branchRepo);
    const updated = await useCase.execute({ id: TEST_ID, requesterId: randomUUID(), name: "Integration Test User" });
    expect(updated.name).toBe("Integration Test User");
  });

  it("update establece avatarUrl personalizado", async () => {
    const customUrl = "https://example.com/avatar.jpg";
    const updated = await new UpdateUserUseCase(repo, branchRepo).execute({
      id: TEST_ID,
      requesterId: randomUUID(),
      avatarUrl: customUrl,
    });
    expect(updated.avatarUrl).toBe(customUrl);
  });

  it("update con avatarUrl: null devuelve Gravatar default", async () => {
    const updated = await new UpdateUserUseCase(repo, branchRepo).execute({
      id: TEST_ID,
      requesterId: randomUUID(),
      avatarUrl: null,
    });
    expect(updated.avatarUrl).toMatch(/gravatar\.com/);
  });

  it("update lanza SelfModificationError si requester === target", async () => {
    await expect(
      new UpdateUserUseCase(repo, branchRepo).execute({ id: TEST_ID, requesterId: TEST_ID, name: "x" })
    ).rejects.toThrow(SelfModificationError);
  });

  it("delete elimina el usuario (y el test lo recrea en afterAll si falla)", async () => {
    const tempId = randomUUID();
    await prisma.user.create({ data: { id: tempId, email: `temp_${Date.now()}@test.local`, passwordHash: "h" } });
    await new DeleteUserUseCase(repo).execute(tempId, randomUUID());
    await expect(new GetUserUseCase(repo).execute(tempId)).rejects.toThrow(UserNotFoundError);
  });
});
