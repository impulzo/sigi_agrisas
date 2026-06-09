import { UpdateUserUseCase } from "@/modules/users/application/use-cases/UpdateUserUseCase";
import { AdminUserRepository } from "@/modules/users/application/ports/AdminUserRepository";
import { AdminUser } from "@/modules/users/domain/entities/AdminUser";
import { SelfModificationError } from "@/modules/users/domain/errors/SelfModificationError";
import { UserNotFoundError } from "@/modules/users/domain/errors/UserNotFoundError";
import { EmailAlreadyInUseError } from "@/modules/users/domain/errors/EmailAlreadyInUseError";
import { BranchNotFoundForUserError } from "@/modules/users/domain/errors/BranchNotFoundForUserError";
import { BranchRepository } from "@/modules/branches/application/ports/BranchRepository";
import { Branch } from "@/modules/branches/domain/entities/Branch";

function makeUser(overrides?: Partial<{ avatarUrl: string; branchId: string | null; branchName: string | null }>): AdminUser {
  return AdminUser.create("uid-2", {
    email: "new@b.com",
    avatarUrl: overrides?.avatarUrl ?? "https://www.gravatar.com/avatar/abc?d=mp&s=200",
    branchId: overrides?.branchId ?? null,
    branchName: overrides?.branchName ?? null,
    roles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function makeRepo(impl?: Partial<AdminUserRepository>): AdminUserRepository {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn().mockResolvedValue(makeUser()),
    delete: jest.fn(),
    ...impl,
  };
}

function makeBranchRepo(impl?: Partial<BranchRepository>): BranchRepository {
  return {
    findAll: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    findHeadquarters: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
    ...impl,
  };
}

describe("UpdateUserUseCase", () => {
  it("actualiza nombre exitosamente", async () => {
    const result = await new UpdateUserUseCase(makeRepo(), makeBranchRepo()).execute({
      id: "uid-2",
      requesterId: "uid-1",
      name: "Nuevo",
    });
    expect(result.id).toBe("uid-2");
  });

  it("lanza SelfModificationError si requester === target", async () => {
    await expect(
      new UpdateUserUseCase(makeRepo(), makeBranchRepo()).execute({ id: "uid-1", requesterId: "uid-1", name: "x" })
    ).rejects.toThrow(SelfModificationError);
  });

  it("lanza error si el body está vacío", async () => {
    await expect(
      new UpdateUserUseCase(makeRepo(), makeBranchRepo()).execute({ id: "uid-2", requesterId: "uid-1" })
    ).rejects.toThrow("At least one field (name, email, avatarUrl, branchId) must be provided");
  });

  it("acepta avatarUrl como único campo", async () => {
    const customUrl = "https://example.com/photo.jpg";
    const repo = makeRepo({ update: jest.fn().mockResolvedValue(makeUser({ avatarUrl: customUrl })) });
    const result = await new UpdateUserUseCase(repo, makeBranchRepo()).execute({
      id: "uid-2",
      requesterId: "uid-1",
      avatarUrl: customUrl,
    });
    expect(result.avatarUrl).toBe(customUrl);
  });

  it("acepta avatarUrl: null para resetear al default de Gravatar", async () => {
    const gravatarUrl = "https://www.gravatar.com/avatar/abc?d=mp&s=200";
    const repo = makeRepo({ update: jest.fn().mockResolvedValue(makeUser({ avatarUrl: gravatarUrl })) });
    const result = await new UpdateUserUseCase(repo, makeBranchRepo()).execute({
      id: "uid-2",
      requesterId: "uid-1",
      avatarUrl: null,
    });
    expect(result.avatarUrl).toMatch(/gravatar\.com/);
  });

  it("acepta branchId nulo (desasignar sucursal)", async () => {
    const result = await new UpdateUserUseCase(makeRepo(), makeBranchRepo()).execute({
      id: "uid-2",
      requesterId: "uid-1",
      branchId: null,
    });
    expect(result.branchId).toBeNull();
  });

  it("rechaza branchId si la sucursal no existe", async () => {
    await expect(
      new UpdateUserUseCase(makeRepo(), makeBranchRepo({ findById: jest.fn().mockResolvedValue(null) })).execute({
        id: "uid-2",
        requesterId: "uid-1",
        branchId: "00000000-0000-0000-0000-000000000000",
      })
    ).rejects.toThrow(BranchNotFoundForUserError);
  });

  it("acepta branchId si la sucursal existe", async () => {
    const now = new Date();
    const branch = Branch.create("b1", {
      code: "HQ",
      name: "Matriz",
      address: null,
      phone: null,
      email: null,
      isHeadquarters: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    const branchRepo = makeBranchRepo({ findById: jest.fn().mockResolvedValue(branch) });
    const repo = makeRepo({
      update: jest.fn().mockResolvedValue(makeUser({ branchId: "b1", branchName: "Matriz" })),
    });
    const result = await new UpdateUserUseCase(repo, branchRepo).execute({
      id: "uid-2",
      requesterId: "uid-1",
      branchId: "b1",
    });
    expect(result.branchId).toBe("b1");
  });

  it("propaga UserNotFoundError del repositorio", async () => {
    const repo = makeRepo({ update: jest.fn().mockRejectedValue(new UserNotFoundError()) });
    await expect(
      new UpdateUserUseCase(repo, makeBranchRepo()).execute({ id: "uid-2", requesterId: "uid-1", name: "x" })
    ).rejects.toThrow(UserNotFoundError);
  });

  it("propaga EmailAlreadyInUseError del repositorio", async () => {
    const repo = makeRepo({ update: jest.fn().mockRejectedValue(new EmailAlreadyInUseError()) });
    await expect(
      new UpdateUserUseCase(repo, makeBranchRepo()).execute({ id: "uid-2", requesterId: "uid-1", email: "taken@b.com" })
    ).rejects.toThrow(EmailAlreadyInUseError);
  });
});
