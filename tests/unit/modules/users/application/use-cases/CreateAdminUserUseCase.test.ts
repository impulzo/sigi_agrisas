import { CreateAdminUserUseCase } from "@/modules/users/application/use-cases/CreateAdminUserUseCase";
import { AdminUserRepository } from "@/modules/users/application/ports/AdminUserRepository";
import { AdminUser } from "@/modules/users/domain/entities/AdminUser";
import { EmailAlreadyInUseError } from "@/modules/users/domain/errors/EmailAlreadyInUseError";
import { BranchNotFoundForUserError } from "@/modules/users/domain/errors/BranchNotFoundForUserError";
import { BranchRepository } from "@/modules/branches/application/ports/BranchRepository";
import { Branch } from "@/modules/branches/domain/entities/Branch";

function makeUser(overrides?: Partial<{ branchId: string | null; branchName: string | null; roles: string[] }>): AdminUser {
  return AdminUser.create("uid-new", {
    name: "Ana Pérez",
    email: "ana@example.com",
    avatarUrl: "https://www.gravatar.com/avatar/abc?d=mp&s=200",
    branchId: overrides?.branchId ?? null,
    branchName: overrides?.branchName ?? null,
    roles: overrides?.roles ?? [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function makeRepo(impl?: Partial<AdminUserRepository>): AdminUserRepository {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn().mockResolvedValue(makeUser()),
    update: jest.fn(),
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

describe("CreateAdminUserUseCase", () => {
  it("crea un usuario con campos mínimos (sin branchId ni roleIds) y sin passwordHash", async () => {
    const repo = makeRepo();
    const result = await new CreateAdminUserUseCase(repo, makeBranchRepo()).execute({
      name: "Ana Pérez",
      email: "ana@example.com",
    });
    expect(result.id).toBe("uid-new");
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Ana Pérez",
        email: "ana@example.com",
        branchId: undefined,
        roleIds: undefined,
      })
    );
    expect(repo.create).toHaveBeenCalledWith(expect.not.objectContaining({ passwordHash: expect.anything() }));
  });

  it("crea un usuario con branchId y roleIds cuando la sucursal existe", async () => {
    const now = new Date();
    const branch = Branch.create("b1", {
      code: "HQ",
      name: "Matriz",
      address: null,
      phone: null,
      email: null,
      isHeadquarters: true,
      isActive: true,
      addressStreet: null,
      addressExteriorNumber: null,
      addressInteriorNumber: null,
      addressNeighborhood: null,
      addressMunicipality: null,
      addressState: null,
      addressCountry: null,
      addressZipCode: null,
      createdAt: now,
      updatedAt: now,
    });
    const branchRepo = makeBranchRepo({ findById: jest.fn().mockResolvedValue(branch) });
    const repo = makeRepo({
      create: jest.fn().mockResolvedValue(makeUser({ branchId: "b1", branchName: "Matriz", roles: ["operator"] })),
    });
    const result = await new CreateAdminUserUseCase(repo, branchRepo).execute({
      name: "Ana Pérez",
      email: "ana@example.com",
      branchId: "b1",
      roleIds: ["role-1"],
    });
    expect(result.branchId).toBe("b1");
    expect(result.roles).toEqual(["operator"]);
    expect(repo.create).toHaveBeenCalledWith(expect.objectContaining({ branchId: "b1", roleIds: ["role-1"] }));
  });

  it("rechaza branchId si la sucursal no existe", async () => {
    await expect(
      new CreateAdminUserUseCase(makeRepo(), makeBranchRepo({ findById: jest.fn().mockResolvedValue(null) })).execute({
        name: "Ana Pérez",
        email: "ana@example.com",
        branchId: "00000000-0000-0000-0000-000000000000",
      })
    ).rejects.toThrow(BranchNotFoundForUserError);
  });

  it("propaga EmailAlreadyInUseError del repositorio", async () => {
    const repo = makeRepo({ create: jest.fn().mockRejectedValue(new EmailAlreadyInUseError()) });
    await expect(
      new CreateAdminUserUseCase(repo, makeBranchRepo()).execute({
        name: "Ana Pérez",
        email: "taken@example.com",
      })
    ).rejects.toThrow(EmailAlreadyInUseError);
  });

  it("no valida la sucursal cuando branchId no viene en la request", async () => {
    const branchRepo = makeBranchRepo();
    await new CreateAdminUserUseCase(makeRepo(), branchRepo).execute({
      name: "Ana Pérez",
      email: "ana@example.com",
    });
    expect(branchRepo.findById).not.toHaveBeenCalled();
  });
});
