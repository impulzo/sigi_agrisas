import { RolePrismaRepository } from "@/modules/rbac/infrastructure/repositories/RolePrismaRepository";
import { RoleAlreadyExistsError } from "@/modules/rbac/domain/errors/RoleAlreadyExistsError";
import { Role } from "@/modules/rbac/domain/entities/Role";
import type { PrismaClient } from "@prisma/client";

function buildRole(): Role {
  const now = new Date();
  return Role.create("role-1", { name: "supervisor", description: undefined, createdAt: now, updatedAt: now });
}

describe("RolePrismaRepository.save — translates P2002 to RoleAlreadyExistsError", () => {
  it("throws RoleAlreadyExistsError when upsert hits a unique constraint (race condition)", async () => {
    const upsert = jest.fn().mockRejectedValue({ code: "P2002" });
    const prisma = { role: { upsert } } as unknown as PrismaClient;
    const repo = new RolePrismaRepository(prisma);

    await expect(repo.save(buildRole())).rejects.toThrow(RoleAlreadyExistsError);
  });

  it("re-throws any other error unchanged", async () => {
    const upsert = jest.fn().mockRejectedValue(new Error("connection lost"));
    const prisma = { role: { upsert } } as unknown as PrismaClient;
    const repo = new RolePrismaRepository(prisma);

    await expect(repo.save(buildRole())).rejects.toThrow("connection lost");
  });
});
