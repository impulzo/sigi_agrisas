import { NextRequest } from "next/server";
import { AuthController } from "@/modules/auth/infrastructure/http/AuthController";
import { RefreshTokenUseCase } from "@/modules/auth/application/use-cases/RefreshTokenUseCase";
import { LoginUseCase } from "@/modules/auth/application/use-cases/LoginUseCase";
import { RegisterUseCase } from "@/modules/auth/application/use-cases/RegisterUseCase";
import { LogoutUseCase } from "@/modules/auth/application/use-cases/LogoutUseCase";
import { JwtTokenService } from "@/modules/auth/infrastructure/services/JwtTokenService";
import { InMemoryUserRepository } from "@/modules/auth/infrastructure/repositories/InMemoryUserRepository";
import { BcryptPasswordHasher } from "@/modules/auth/infrastructure/services/BcryptPasswordHasher";
import { RoleAssigner } from "@/modules/rbac/application/ports/RoleAssigner";

const noopRoleAssigner: RoleAssigner = { assignDefaultRole: async () => {} };

// Node.js Fetch API restricts `set-cookie` header reads from Response.headers for security.
// Capture it via spy on Headers.prototype.set instead.
function captureSetCookieHeader(fn: () => Promise<Response>): Promise<{ res: Response; setCookieValue: string | undefined }> {
  const calls: Array<[string, string]> = [];
  const spy = jest.spyOn(Headers.prototype, "set").mockImplementation(function (this: Headers, name: string, value: string) {
    calls.push([name, value]);
    return Headers.prototype.set.call(this, name, value);
  });
  // We need the original set, so use a different approach
  spy.mockRestore();

  const setCalls: string[] = [];
  const originalSet = Headers.prototype.set;
  Headers.prototype.set = function (name: string, value: string) {
    if (name === "Set-Cookie") setCalls.push(value);
    return originalSet.call(this, name, value);
  };

  return fn().then((res) => {
    Headers.prototype.set = originalSet;
    return { res, setCookieValue: setCalls[0] };
  }).catch((err) => {
    Headers.prototype.set = originalSet;
    throw err;
  });
}

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = "test-access-secret-32chars-long!!";
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-32chars-long!";
});

describe("AuthController.refresh — HTTP cookie rotation", () => {
  let controller: AuthController;
  let tokenService: JwtTokenService;

  beforeEach(() => {
    const repo = new InMemoryUserRepository();
    const hasher = new BcryptPasswordHasher();
    tokenService = new JwtTokenService();
    controller = new AuthController(
      new RegisterUseCase(repo, hasher, tokenService, noopRoleAssigner),
      new LoginUseCase(repo, hasher, tokenService),
      new RefreshTokenUseCase(tokenService),
      new LogoutUseCase(),
    );
  });

  it("emits Set-Cookie with Max-Age=604800, HttpOnly, SameSite=Strict on successful refresh", async () => {
    const validRefreshToken = tokenService.generateRefreshToken({
      sub: "user-1",
      email: "a@b.com",
    });
    const req = new NextRequest("http://localhost/api/v1/auth/refresh", {
      method: "POST",
      headers: { cookie: `refreshToken=${validRefreshToken}` },
    });

    const { res, setCookieValue } = await captureSetCookieHeader(() => controller.refresh(req));

    expect(res.status).toBe(200);
    expect(setCookieValue).toBeDefined();
    expect(setCookieValue).toContain("Max-Age=604800");
    expect(setCookieValue?.toLowerCase()).toContain("httponly");
    expect(setCookieValue?.toLowerCase()).toContain("samesite=strict");
  });

  it("response body contains new accessToken on successful refresh", async () => {
    const validRefreshToken = tokenService.generateRefreshToken({
      sub: "user-1",
      email: "a@b.com",
    });
    const req = new NextRequest("http://localhost/api/v1/auth/refresh", {
      method: "POST",
      headers: { cookie: `refreshToken=${validRefreshToken}` },
    });

    const res = await controller.refresh(req);
    const body = await res.json() as { accessToken?: string };

    expect(res.status).toBe(200);
    expect(body.accessToken).toBeTruthy();
  });

  it("returns 401 and no Set-Cookie on expired refresh token", async () => {
    jest.useFakeTimers();
    const expiredToken = tokenService.generateRefreshToken({
      sub: "user-1",
      email: "a@b.com",
    });
    jest.advanceTimersByTime(8 * 24 * 60 * 60 * 1000); // 8 days

    const req = new NextRequest("http://localhost/api/v1/auth/refresh", {
      method: "POST",
      headers: { cookie: `refreshToken=${expiredToken}` },
    });

    const { res, setCookieValue } = await captureSetCookieHeader(() => controller.refresh(req));

    expect(res.status).toBe(401);
    expect(setCookieValue).toBeUndefined();
    jest.useRealTimers();
  });

  it("returns 401 for missing refresh token cookie", async () => {
    const req = new NextRequest("http://localhost/api/v1/auth/refresh", {
      method: "POST",
    });

    const res = await controller.refresh(req);

    expect(res.status).toBe(401);
  });
});
