import { GetUserUseCase } from "@/modules/users/application/use-cases/GetUserUseCase";
import { AdminUserRepository } from "@/modules/users/application/ports/AdminUserRepository";
import { AdminUser } from "@/modules/users/domain/entities/AdminUser";
import { UserNotFoundError } from "@/modules/users/domain/errors/UserNotFoundError";

function makeRepo(user: AdminUser | null): AdminUserRepository {
  return {
    findAll: jest.fn(),
    findById: jest.fn().mockResolvedValue(user),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

describe("GetUserUseCase", () => {
  const user = AdminUser.create("uid-1", {
    email: "a@b.com",
    avatarUrl: "https://www.gravatar.com/avatar/hash?d=mp&s=200",
    branchId: null,
    branchName: null,
    roles: ["admin"],
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  it("devuelve el usuario si existe", async () => {
    const result = await new GetUserUseCase(makeRepo(user)).execute("uid-1");
    expect(result.id).toBe("uid-1");
  });

  it("lanza UserNotFoundError si no existe", async () => {
    await expect(new GetUserUseCase(makeRepo(null)).execute("uid-x")).rejects.toThrow(UserNotFoundError);
  });
});
