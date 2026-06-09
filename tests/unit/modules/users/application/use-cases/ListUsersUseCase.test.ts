import { ListUsersUseCase } from "@/modules/users/application/use-cases/ListUsersUseCase";
import { AdminUserRepository } from "@/modules/users/application/ports/AdminUserRepository";
import { AdminUser } from "@/modules/users/domain/entities/AdminUser";

function makeUser(i: number): AdminUser {
  return AdminUser.create(`id-${i}`, {
    email: `user${i}@test.com`,
    avatarUrl: `https://www.gravatar.com/avatar/hash${i}?d=mp&s=200`,
    branchId: null,
    branchName: null,
    roles: ["viewer"],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function makeRepo(users: AdminUser[], total: number): AdminUserRepository {
  return {
    findAll: jest.fn().mockResolvedValue({ users, total }),
    findById: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

describe("ListUsersUseCase", () => {
  it("devuelve usuarios con paginación", async () => {
    const users = [makeUser(1), makeUser(2)];
    const useCase = new ListUsersUseCase(makeRepo(users, 10));
    const result = await useCase.execute({ page: 1, pageSize: 20 });
    expect(result.users).toHaveLength(2);
    expect(result.total).toBe(10);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("normaliza page < 1 a 1", async () => {
    const repo = makeRepo([], 0);
    const useCase = new ListUsersUseCase(repo);
    await useCase.execute({ page: 0, pageSize: 10 });
    expect(repo.findAll).toHaveBeenCalledWith({ page: 1, pageSize: 10 });
  });

  it("lanza error si pageSize > 100", async () => {
    const useCase = new ListUsersUseCase(makeRepo([], 0));
    await expect(useCase.execute({ page: 1, pageSize: 101 })).rejects.toThrow("pageSize must not exceed 100");
  });
});
