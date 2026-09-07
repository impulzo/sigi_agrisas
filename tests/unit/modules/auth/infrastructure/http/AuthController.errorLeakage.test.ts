import { NextRequest } from "next/server";
import { AuthController } from "@/modules/auth/infrastructure/http/AuthController";
import { RegisterUseCase } from "@/modules/auth/application/use-cases/RegisterUseCase";
import { LoginUseCase } from "@/modules/auth/application/use-cases/LoginUseCase";
import { RefreshTokenUseCase } from "@/modules/auth/application/use-cases/RefreshTokenUseCase";
import { LogoutUseCase } from "@/modules/auth/application/use-cases/LogoutUseCase";
import { CompletePasswordSetupUseCase } from "@/modules/auth/application/use-cases/CompletePasswordSetupUseCase";
import { GetUserUseCase } from "@/modules/users/application/use-cases/GetUserUseCase";
import { UpdateOwnProfileUseCase } from "@/modules/users/application/use-cases/UpdateOwnProfileUseCase";
import { SendSetPasswordEmailUseCase } from "@/modules/auth/application/use-cases/SendSetPasswordEmailUseCase";
import { EmailAlreadyInUseError } from "@/modules/auth/domain/errors/EmailAlreadyInUseError";

function buildController(overrides: {
  registerExecute?: jest.Mock;
  completeSetPasswordExecute?: jest.Mock;
}): AuthController {
  const registerUseCase = { execute: overrides.registerExecute } as unknown as RegisterUseCase;
  const completePasswordSetupUseCase = {
    execute: overrides.completeSetPasswordExecute,
  } as unknown as CompletePasswordSetupUseCase;

  return new AuthController(
    registerUseCase,
    {} as LoginUseCase,
    {} as RefreshTokenUseCase,
    {} as LogoutUseCase,
    completePasswordSetupUseCase,
    {} as GetUserUseCase,
    {} as UpdateOwnProfileUseCase,
    {} as SendSetPasswordEmailUseCase
  );
}

describe("AuthController — endpoints públicos no filtran err.message crudo", () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it("register: un error no tipado responde 500 genérico sin exponer el mensaje interno", async () => {
    const internalMessage = 'Default role "viewer" not found. Run the seed script.';
    const controller = buildController({
      registerExecute: jest.fn().mockRejectedValue(new Error(internalMessage)),
    });

    const req = new NextRequest("http://localhost/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Test", email: "a@b.com", password: "password123" }),
    });

    const res = await controller.register(req);
    const body = (await res.json()) as { error?: string };

    expect(res.status).toBe(500);
    expect(body.error).toBe("Internal server error");
    expect(JSON.stringify(body)).not.toContain(internalMessage);
  });

  it("register: EmailAlreadyInUseError sigue devolviendo 409 con su mensaje propio", async () => {
    const controller = buildController({
      registerExecute: jest.fn().mockRejectedValue(new EmailAlreadyInUseError()),
    });

    const req = new NextRequest("http://localhost/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Test", email: "a@b.com", password: "password123" }),
    });

    const res = await controller.register(req);
    const body = (await res.json()) as { error?: string };

    expect(res.status).toBe(409);
    expect(body.error).toBe("Email already in use");
  });

  it("completeSetPassword: un error no tipado responde 500 genérico sin exponer el mensaje interno", async () => {
    const internalMessage = "JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be defined";
    const controller = buildController({
      completeSetPasswordExecute: jest.fn().mockRejectedValue(new Error(internalMessage)),
    });

    const req = new NextRequest("http://localhost/api/v1/auth/set-password", {
      method: "POST",
      body: JSON.stringify({ token: "abc", password: "password123" }),
    });

    const res = await controller.completeSetPassword(req);
    const body = (await res.json()) as { error?: string };

    expect(res.status).toBe(500);
    expect(body.error).toBe("Internal server error");
    expect(JSON.stringify(body)).not.toContain(internalMessage);
  });
});
