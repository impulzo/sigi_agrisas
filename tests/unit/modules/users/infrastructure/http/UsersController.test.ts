import { NextRequest } from "next/server";
import { UsersController } from "@/modules/users/infrastructure/http/UsersController";
import { ListUsersUseCase } from "@/modules/users/application/use-cases/ListUsersUseCase";
import { GetUserUseCase } from "@/modules/users/application/use-cases/GetUserUseCase";
import { CreateAdminUserUseCase } from "@/modules/users/application/use-cases/CreateAdminUserUseCase";
import { UpdateUserUseCase } from "@/modules/users/application/use-cases/UpdateUserUseCase";
import { DeleteUserUseCase } from "@/modules/users/application/use-cases/DeleteUserUseCase";
import { AdminUserRepository } from "@/modules/users/application/ports/AdminUserRepository";
import { AdminUser } from "@/modules/users/domain/entities/AdminUser";
import { BranchRepository } from "@/modules/branches/application/ports/BranchRepository";
import { PasswordHasher } from "@/modules/auth/application/ports/PasswordHasher";

function makeUser(): AdminUser {
  return AdminUser.create("uid-new", {
    name: "Ana Pérez",
    email: "ana@example.com",
    avatarUrl: "https://www.gravatar.com/avatar/abc?d=mp&s=200",
    branchId: null,
    branchName: null,
    roles: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

function makeRepo(): AdminUserRepository {
  return {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn().mockResolvedValue(makeUser()),
    update: jest.fn(),
    delete: jest.fn(),
  };
}

function makeBranchRepo(): BranchRepository {
  return {
    findAll: jest.fn(),
    findById: jest.fn().mockResolvedValue(null),
    findHeadquarters: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  };
}

function makeHasher(): PasswordHasher {
  return { hash: jest.fn().mockResolvedValue("hashed"), compare: jest.fn() };
}

function buildController() {
  const repo = makeRepo();
  const branchRepo = makeBranchRepo();
  const hasher = makeHasher();
  return new UsersController(
    new ListUsersUseCase(repo),
    new GetUserUseCase(repo),
    new CreateAdminUserUseCase(repo, branchRepo, hasher),
    new UpdateUserUseCase(repo, branchRepo),
    new DeleteUserUseCase(repo)
  );
}

function makeCreateReq(body: unknown) {
  return new NextRequest("http://localhost/api/v1/admin/users", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("UsersController.createUser — Zod validation", () => {
  it("rejects password shorter than 8 characters", async () => {
    const ctrl = buildController();
    const res = await ctrl.createUser(
      makeCreateReq({ name: "Ana Pérez", email: "ana@example.com", password: "short" })
    );
    expect(res.status).toBe(400);
  });

  it("rejects missing name", async () => {
    const ctrl = buildController();
    const res = await ctrl.createUser(makeCreateReq({ email: "ana@example.com", password: "supersecret" }));
    expect(res.status).toBe(400);
  });

  it("rejects missing email", async () => {
    const ctrl = buildController();
    const res = await ctrl.createUser(makeCreateReq({ name: "Ana Pérez", password: "supersecret" }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid email format", async () => {
    const ctrl = buildController();
    const res = await ctrl.createUser(
      makeCreateReq({ name: "Ana Pérez", email: "not-an-email", password: "supersecret" })
    );
    expect(res.status).toBe(400);
  });

  it("accepts a valid minimal body and returns 201", async () => {
    const ctrl = buildController();
    const res = await ctrl.createUser(
      makeCreateReq({ name: "Ana Pérez", email: "ana@example.com", password: "supersecret" })
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.passwordHash).toBeUndefined();
  });
});
