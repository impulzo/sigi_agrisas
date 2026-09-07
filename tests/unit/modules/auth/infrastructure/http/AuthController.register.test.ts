/**
 * `POST /api/v1/auth/register` ya no es público (gate `users:write` en
 * `app/api/v1/auth/register/route.ts`, cubierto genéricamente por
 * `requirePermission.test.ts`). Este archivo cubre lo que sí es responsabilidad
 * del controller/use case: la respuesta de éxito ya NO debe emitir
 * accessToken/refreshToken ni una cookie Set-Cookie — de lo contrario, un admin
 * que da de alta a otro usuario se auto-sobrescribiría su propia sesión.
 */
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
import { InMemoryUserRepository } from "@/modules/auth/infrastructure/repositories/InMemoryUserRepository";
import { InMemoryPasswordSetupTokenRepository } from "@/modules/auth/infrastructure/repositories/InMemoryPasswordSetupTokenRepository";
import { BcryptPasswordHasher } from "@/modules/auth/infrastructure/services/BcryptPasswordHasher";
import { JwtTokenService } from "@/modules/auth/infrastructure/services/JwtTokenService";
import { RoleAssigner } from "@/modules/rbac/application/ports/RoleAssigner";

const noopRoleAssigner: RoleAssigner = { assignDefaultRole: async () => {} };

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = "test-access-secret-32chars-long!!";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-32chars-long!";
});

describe("AuthController.register — sin emisión de tokens", () => {
  function buildController(): AuthController {
    const repo = new InMemoryUserRepository();
    const hasher = new BcryptPasswordHasher();
    const tokenSetupRepo = new InMemoryPasswordSetupTokenRepository();
    const tokenService = new JwtTokenService();
    return new AuthController(
      new RegisterUseCase(repo, hasher, noopRoleAssigner),
      new LoginUseCase(repo, hasher, tokenService),
      new RefreshTokenUseCase(tokenService),
      new LogoutUseCase(),
      new CompletePasswordSetupUseCase(repo, tokenSetupRepo, hasher, tokenService),
      {} as GetUserUseCase,
      {} as UpdateOwnProfileUseCase,
      {} as SendSetPasswordEmailUseCase
    );
  }

  it("returns 201 with only { user }, no accessToken/refreshToken in the body", async () => {
    const controller = buildController();
    const req = new NextRequest("http://localhost/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Nuevo", email: "nuevo@example.com", password: "password123" }),
    });

    const res = await controller.register(req);
    const body = (await res.json()) as Record<string, unknown>;

    expect(res.status).toBe(201);
    expect(body.user).toMatchObject({ email: "nuevo@example.com", name: "Nuevo" });
    expect(body).not.toHaveProperty("accessToken");
    expect(body).not.toHaveProperty("refreshToken");
  });

  it("does not set a Set-Cookie header on success", async () => {
    const controller = buildController();
    const req = new NextRequest("http://localhost/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Otro", email: "otro@example.com", password: "password123" }),
    });

    const res = await controller.register(req);

    expect(res.headers.get("set-cookie")).toBeNull();
  });
});
