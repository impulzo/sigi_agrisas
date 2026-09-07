import { UpdateOwnProfileUseCase } from "@/modules/users/application/use-cases/UpdateOwnProfileUseCase";
import { AdminUserRepository } from "@/modules/users/application/ports/AdminUserRepository";
import { AdminUser } from "@/modules/users/domain/entities/AdminUser";
import { EmailAlreadyInUseError } from "@/modules/users/domain/errors/EmailAlreadyInUseError";

function makeUser(overrides?: Partial<{ name: string; email: string }>): AdminUser {
  return AdminUser.create("uid-1", {
    email: overrides?.email ?? "user@example.com",
    name: overrides?.name ?? "Usuario",
    avatarUrl: "https://www.gravatar.com/avatar/abc?d=mp&s=200",
    branchId: null,
    branchName: null,
    roles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function makeRepo(impl?: Partial<AdminUserRepository>): AdminUserRepository {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn().mockResolvedValue(makeUser()),
    delete: jest.fn(),
    ...impl,
  };
}

describe("UpdateOwnProfileUseCase", () => {
  it("actualiza nombre y correo propios exitosamente", async () => {
    const repo = makeRepo({ update: jest.fn().mockResolvedValue(makeUser({ name: "Nuevo Nombre" })) });
    const result = await new UpdateOwnProfileUseCase(repo).execute({
      id: "uid-1",
      name: "Nuevo Nombre",
    });
    expect(result.name).toBe("Nuevo Nombre");
    expect(repo.update).toHaveBeenCalledWith("uid-1", { name: "Nuevo Nombre", email: undefined });
  });

  it("aplica sólo los campos provistos (actualización parcial)", async () => {
    const repo = makeRepo();
    await new UpdateOwnProfileUseCase(repo).execute({ id: "uid-1", email: "nuevo@example.com" });
    expect(repo.update).toHaveBeenCalledWith("uid-1", { name: undefined, email: "nuevo@example.com" });
  });

  it("lanza error si no se provee ningún campo", async () => {
    const repo = makeRepo();
    await expect(new UpdateOwnProfileUseCase(repo).execute({ id: "uid-1" })).rejects.toThrow(
      "At least one field (name, email) must be provided"
    );
    expect(repo.update).not.toHaveBeenCalled();
  });

  it("propaga EmailAlreadyInUseError del repositorio", async () => {
    const repo = makeRepo({ update: jest.fn().mockRejectedValue(new EmailAlreadyInUseError()) });
    await expect(
      new UpdateOwnProfileUseCase(repo).execute({ id: "uid-1", email: "taken@example.com" })
    ).rejects.toThrow(EmailAlreadyInUseError);
  });
});
