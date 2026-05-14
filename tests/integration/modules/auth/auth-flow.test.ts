import { RegisterUseCase } from "@/modules/auth/application/use-cases/RegisterUseCase";
import { LoginUseCase } from "@/modules/auth/application/use-cases/LoginUseCase";
import { RefreshTokenUseCase } from "@/modules/auth/application/use-cases/RefreshTokenUseCase";
import { LogoutUseCase } from "@/modules/auth/application/use-cases/LogoutUseCase";
import { InMemoryUserRepository } from "@/modules/auth/infrastructure/repositories/InMemoryUserRepository";
import { BcryptPasswordHasher } from "@/modules/auth/infrastructure/services/BcryptPasswordHasher";
import { JwtTokenService } from "@/modules/auth/infrastructure/services/JwtTokenService";
import { InvalidCredentialsError } from "@/modules/auth/domain/errors/InvalidCredentialsError";
import { EmailAlreadyInUseError } from "@/modules/auth/domain/errors/EmailAlreadyInUseError";

beforeAll(() => {
  process.env.JWT_ACCESS_SECRET = "integration-access-secret-32chars!";
  process.env.JWT_REFRESH_SECRET = "integration-refresh-secret-32char";
});

describe("Auth flow integration (InMemoryUserRepository + real services)", () => {
  let repo: InMemoryUserRepository;
  let hasher: BcryptPasswordHasher;
  let tokenService: JwtTokenService;
  let registerUseCase: RegisterUseCase;
  let loginUseCase: LoginUseCase;
  let refreshTokenUseCase: RefreshTokenUseCase;
  let logoutUseCase: LogoutUseCase;

  beforeEach(() => {
    repo = new InMemoryUserRepository();
    hasher = new BcryptPasswordHasher();
    tokenService = new JwtTokenService();
    registerUseCase = new RegisterUseCase(repo, hasher);
    loginUseCase = new LoginUseCase(repo, hasher, tokenService);
    refreshTokenUseCase = new RefreshTokenUseCase(tokenService);
    logoutUseCase = new LogoutUseCase();
  });

  it("completes the full register → login → refresh → logout flow", async () => {
    const registered = await registerUseCase.execute({
      email: "user@example.com",
      password: "password123",
    });
    expect(registered.user.email).toBe("user@example.com");
    expect(registered.user.id).toBeDefined();

    const loginResult = await loginUseCase.execute({
      email: "user@example.com",
      password: "password123",
    });
    expect(loginResult.accessToken).toBeDefined();
    expect(loginResult.refreshToken).toBeDefined();
    expect(loginResult.user.id).toBe(registered.user.id);

    const refreshResult = refreshTokenUseCase.execute(loginResult.refreshToken);
    expect(refreshResult.accessToken).toBeDefined();

    const payload = tokenService.verifyAccessToken(refreshResult.accessToken);
    expect(payload.sub).toBe(registered.user.id);
    expect(payload.email).toBe("user@example.com");

    // Logout es no-op a nivel de use case; el clear de cookie ocurre en el adaptador HTTP
    expect(() => logoutUseCase.execute()).not.toThrow();
  }, 15_000);

  it("rejects login with wrong password", async () => {
    await registerUseCase.execute({ email: "a@b.com", password: "correctpass" });
    await expect(
      loginUseCase.execute({ email: "a@b.com", password: "wrongpass" })
    ).rejects.toThrow(InvalidCredentialsError);
  }, 15_000);

  it("rejects login for non-existent user", async () => {
    await expect(
      loginUseCase.execute({ email: "ghost@example.com", password: "password1" })
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it("rejects registration with duplicate email", async () => {
    await registerUseCase.execute({ email: "dup@example.com", password: "password1" });
    await expect(
      registerUseCase.execute({ email: "dup@example.com", password: "password2" })
    ).rejects.toThrow(EmailAlreadyInUseError);
  }, 15_000);

  it("rejects refresh with invalid token", () => {
    expect(() => refreshTokenUseCase.execute("invalid.token.here")).toThrow();
  });
});
