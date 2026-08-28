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
import type { SendSetPasswordEmailUseCase } from "@/modules/auth/application/use-cases/SendSetPasswordEmailUseCase";
import { SetPasswordEmailSendFailedError } from "@/modules/auth/domain/errors/SetPasswordEmailSendFailedError";

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
    findById: jest.fn().mockResolvedValue(makeUser()),
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

function makeSendSetPasswordEmailUseCase(
  impl?: Partial<SendSetPasswordEmailUseCase>
): SendSetPasswordEmailUseCase {
  return {
    execute: jest.fn().mockResolvedValue({ sentTo: "ana@example.com" }),
    ...impl,
  } as unknown as SendSetPasswordEmailUseCase;
}

function buildController(sendSetPasswordEmailUseCase = makeSendSetPasswordEmailUseCase()) {
  const repo = makeRepo();
  const branchRepo = makeBranchRepo();
  return {
    ctrl: new UsersController(
      new ListUsersUseCase(repo),
      new GetUserUseCase(repo),
      new CreateAdminUserUseCase(repo, branchRepo),
      new UpdateUserUseCase(repo, branchRepo),
      new DeleteUserUseCase(repo),
      sendSetPasswordEmailUseCase
    ),
    repo,
  };
}

function makeCreateReq(body: unknown) {
  return new NextRequest("http://localhost/api/v1/admin/users", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("UsersController.createUser — Zod validation", () => {
  it("rejects missing name", async () => {
    const { ctrl } = buildController();
    const res = await ctrl.createUser(makeCreateReq({ email: "ana@example.com" }));
    expect(res.status).toBe(400);
  });

  it("rejects missing email", async () => {
    const { ctrl } = buildController();
    const res = await ctrl.createUser(makeCreateReq({ name: "Ana Pérez" }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid email format", async () => {
    const { ctrl } = buildController();
    const res = await ctrl.createUser(makeCreateReq({ name: "Ana Pérez", email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("accepts a valid minimal body without password and returns 201", async () => {
    const { ctrl } = buildController();
    const res = await ctrl.createUser(makeCreateReq({ name: "Ana Pérez", email: "ana@example.com" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.passwordHash).toBeUndefined();
  });

  it("triggers the set-password email on successful creation without blocking the response", async () => {
    const sendUseCase = makeSendSetPasswordEmailUseCase();
    const { ctrl } = buildController(sendUseCase);
    const res = await ctrl.createUser(makeCreateReq({ name: "Ana Pérez", email: "ana@example.com" }));
    expect(res.status).toBe(201);
    await Promise.resolve();
    expect(sendUseCase.execute).toHaveBeenCalledWith("uid-new");
  });

  it("does not fail creation when the set-password email fails to send", async () => {
    const sendUseCase = makeSendSetPasswordEmailUseCase({
      execute: jest.fn().mockRejectedValue(new SetPasswordEmailSendFailedError(new Error("smtp down"))),
    });
    const { ctrl } = buildController(sendUseCase);
    const res = await ctrl.createUser(makeCreateReq({ name: "Ana Pérez", email: "ana@example.com" }));
    expect(res.status).toBe(201);
  });
});

describe("UsersController.resendSetPasswordEmail", () => {
  const VALID_ID = "11111111-1111-4111-8111-111111111111";

  function makeResendReq() {
    return new NextRequest(`http://localhost/api/v1/admin/users/${VALID_ID}/resend-set-password-email`, {
      method: "POST",
    });
  }

  it("returns 200 with sentTo on success", async () => {
    const sendUseCase = makeSendSetPasswordEmailUseCase();
    const { ctrl } = buildController(sendUseCase);
    const res = await ctrl.resendSetPasswordEmail(makeResendReq(), VALID_ID);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sentTo).toBe("ana@example.com");
    expect(sendUseCase.execute).toHaveBeenCalledWith(VALID_ID);
  });

  it("returns 502 when email delivery fails", async () => {
    const sendUseCase = makeSendSetPasswordEmailUseCase({
      execute: jest.fn().mockRejectedValue(new SetPasswordEmailSendFailedError(new Error("smtp down"))),
    });
    const { ctrl } = buildController(sendUseCase);
    const res = await ctrl.resendSetPasswordEmail(makeResendReq(), VALID_ID);
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("EmailDeliveryFailed");
  });

  it("returns 400 for a malformed id", async () => {
    const { ctrl } = buildController();
    const res = await ctrl.resendSetPasswordEmail(makeResendReq(), "not-a-uuid");
    expect(res.status).toBe(400);
  });
});
