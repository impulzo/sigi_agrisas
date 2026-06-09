import { DeleteUserUseCase } from "@/modules/users/application/use-cases/DeleteUserUseCase";
import { AdminUserRepository } from "@/modules/users/application/ports/AdminUserRepository";
import { SelfModificationError } from "@/modules/users/domain/errors/SelfModificationError";
import { UserNotFoundError } from "@/modules/users/domain/errors/UserNotFoundError";

function makeRepo(impl?: Partial<AdminUserRepository>): AdminUserRepository {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn().mockResolvedValue(undefined),
    ...impl,
  };
}

describe("DeleteUserUseCase", () => {
  it("elimina el usuario exitosamente", async () => {
    const repo = makeRepo();
    await new DeleteUserUseCase(repo).execute("uid-2", "uid-1");
    expect(repo.delete).toHaveBeenCalledWith("uid-2");
  });

  it("lanza SelfModificationError si requester === target", async () => {
    await expect(
      new DeleteUserUseCase(makeRepo()).execute("uid-1", "uid-1")
    ).rejects.toThrow(SelfModificationError);
  });

  it("propaga UserNotFoundError del repositorio", async () => {
    const repo = makeRepo({ delete: jest.fn().mockRejectedValue(new UserNotFoundError()) });
    await expect(
      new DeleteUserUseCase(repo).execute("uid-2", "uid-1")
    ).rejects.toThrow(UserNotFoundError);
  });
});
