import { NextRequest } from "next/server";
import { AuthController } from "@/modules/auth/infrastructure/http/AuthController";
import { RegisterUseCase } from "@/modules/auth/application/use-cases/RegisterUseCase";
import { LoginUseCase } from "@/modules/auth/application/use-cases/LoginUseCase";
import { RefreshTokenUseCase } from "@/modules/auth/application/use-cases/RefreshTokenUseCase";
import { LogoutUseCase } from "@/modules/auth/application/use-cases/LogoutUseCase";
import { CompletePasswordSetupUseCase } from "@/modules/auth/application/use-cases/CompletePasswordSetupUseCase";
import type { GetUserUseCase } from "@/modules/users/application/use-cases/GetUserUseCase";
import type { UpdateOwnProfileUseCase } from "@/modules/users/application/use-cases/UpdateOwnProfileUseCase";
import type { SendSetPasswordEmailUseCase } from "@/modules/auth/application/use-cases/SendSetPasswordEmailUseCase";
import { UserNotFoundError } from "@/modules/users/domain/errors/UserNotFoundError";
import { EmailAlreadyInUseError } from "@/modules/users/domain/errors/EmailAlreadyInUseError";

function buildController(
  getUserUseCase: GetUserUseCase,
  updateOwnProfileUseCase: UpdateOwnProfileUseCase
): AuthController {
  return new AuthController(
    {} as RegisterUseCase,
    {} as LoginUseCase,
    {} as RefreshTokenUseCase,
    {} as LogoutUseCase,
    {} as CompletePasswordSetupUseCase,
    getUserUseCase,
    updateOwnProfileUseCase,
    {} as SendSetPasswordEmailUseCase
  );
}

function makeGetReq(userId: string): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth/me", {
    method: "GET",
    headers: { "x-user-id": userId },
  });
}

function makePatchReq(userId: string, body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/v1/auth/me", {
    method: "PATCH",
    headers: { "x-user-id": userId, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const USER = {
  id: "uid-1",
  name: "Usuario Original",
  email: "original@example.com",
  avatarUrl: "https://www.gravatar.com/avatar/abc?d=mp&s=200",
};

describe("AuthController.me", () => {
  it("returns the profile resolved from x-user-id", async () => {
    const execute = jest.fn().mockResolvedValue(USER);
    const controller = buildController({ execute } as unknown as GetUserUseCase, {} as UpdateOwnProfileUseCase);

    const res = await controller.me(makeGetReq("uid-1"));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toEqual({ id: USER.id, name: USER.name, email: USER.email, avatarUrl: USER.avatarUrl });
    expect(execute).toHaveBeenCalledWith("uid-1");
  });

  it("returns 404 when the user can't be found", async () => {
    const execute = jest.fn().mockRejectedValue(new UserNotFoundError());
    const controller = buildController({ execute } as unknown as GetUserUseCase, {} as UpdateOwnProfileUseCase);

    const res = await controller.me(makeGetReq("uid-missing"));

    expect(res.status).toBe(404);
  });
});

describe("AuthController.updateMe", () => {
  it("applies a partial update and returns the updated profile", async () => {
    const execute = jest.fn().mockResolvedValue({ ...USER, name: "Nuevo Nombre" });
    const controller = buildController({} as GetUserUseCase, { execute } as unknown as UpdateOwnProfileUseCase);

    const res = await controller.updateMe(makePatchReq("uid-1", { name: "Nuevo Nombre" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.name).toBe("Nuevo Nombre");
    expect(execute).toHaveBeenCalledWith({ id: "uid-1", name: "Nuevo Nombre", email: undefined });
  });

  it("returns 400 when no fields are provided", async () => {
    const execute = jest.fn();
    const controller = buildController({} as GetUserUseCase, { execute } as unknown as UpdateOwnProfileUseCase);

    const res = await controller.updateMe(makePatchReq("uid-1", {}));

    expect(res.status).toBe(400);
    expect(execute).not.toHaveBeenCalled();
  });

  it("returns 400 when the email format is invalid", async () => {
    const execute = jest.fn();
    const controller = buildController({} as GetUserUseCase, { execute } as unknown as UpdateOwnProfileUseCase);

    const res = await controller.updateMe(makePatchReq("uid-1", { email: "not-an-email" }));

    expect(res.status).toBe(400);
    expect(execute).not.toHaveBeenCalled();
  });

  it("returns 409 when the email is already in use by another account", async () => {
    const execute = jest.fn().mockRejectedValue(new EmailAlreadyInUseError());
    const controller = buildController({} as GetUserUseCase, { execute } as unknown as UpdateOwnProfileUseCase);

    const res = await controller.updateMe(makePatchReq("uid-1", { email: "otro@example.com" }));

    expect(res.status).toBe(409);
  });

  it("returns 404 when the user can't be found", async () => {
    const execute = jest.fn().mockRejectedValue(new UserNotFoundError());
    const controller = buildController({} as GetUserUseCase, { execute } as unknown as UpdateOwnProfileUseCase);

    const res = await controller.updateMe(makePatchReq("uid-missing", { name: "X" }));

    expect(res.status).toBe(404);
  });
});
