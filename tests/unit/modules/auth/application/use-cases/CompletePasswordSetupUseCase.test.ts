import { createHash } from "node:crypto";
import { CompletePasswordSetupUseCase } from "@/modules/auth/application/use-cases/CompletePasswordSetupUseCase";
import { InMemoryUserRepository } from "@/modules/auth/infrastructure/repositories/InMemoryUserRepository";
import { InMemoryPasswordSetupTokenRepository } from "@/modules/auth/infrastructure/repositories/InMemoryPasswordSetupTokenRepository";
import { PasswordHasher } from "@/modules/auth/application/ports/PasswordHasher";
import { TokenService, TokenPayload } from "@/modules/auth/application/ports/TokenService";
import { User } from "@/modules/auth/domain/entities/User";
import { PasswordSetupTokenInvalidError } from "@/modules/auth/domain/errors/PasswordSetupTokenInvalidError";
import { PasswordSetupTokenExpiredError } from "@/modules/auth/domain/errors/PasswordSetupTokenExpiredError";

const fakeHasher: PasswordHasher = {
  hash: async (p) => `hashed:${p}`,
  compare: async (p, h) => h === `hashed:${p}`,
};

const fakeTokenService: TokenService = {
  generateAccessToken: (p: TokenPayload) => `access:${p.sub}`,
  generateRefreshToken: (p: TokenPayload) => `refresh:${p.sub}`,
  verifyAccessToken: () => ({ sub: "id", email: "e" }),
  verifyRefreshToken: () => ({ sub: "id", email: "e" }),
};

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

describe("CompletePasswordSetupUseCase", () => {
  let userRepo: InMemoryUserRepository;
  let tokenRepo: InMemoryPasswordSetupTokenRepository;
  let useCase: CompletePasswordSetupUseCase;

  beforeEach(async () => {
    userRepo = new InMemoryUserRepository();
    tokenRepo = new InMemoryPasswordSetupTokenRepository();
    useCase = new CompletePasswordSetupUseCase(userRepo, tokenRepo, fakeHasher, fakeTokenService);

    const now = new Date();
    await userRepo.save(
      User.create("user-1", {
        name: "Ana",
        email: "ana@example.com",
        passwordHash: null,
        roles: [],
        branchId: null,
        createdAt: now,
        updatedAt: now,
      })
    );
  });

  it("sets the password, consumes the token, and auto-logs in on success", async () => {
    const rawToken = "raw-token-123";
    await tokenRepo.create({
      userId: "user-1",
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60_000),
    });

    const result = await useCase.execute({ token: rawToken, password: "brandNewPass1" });

    expect(result.accessToken).toBe("access:user-1");
    expect(result.refreshToken).toBe("refresh:user-1");
    expect(result.user.email).toBe("ana@example.com");

    const updatedUser = await userRepo.findById("user-1");
    expect(updatedUser?.passwordHash).toBe("hashed:brandNewPass1");

    const stillValid = await tokenRepo.findValidByHash(hashToken(rawToken));
    expect(stillValid).toBeNull();
  });

  it("throws PasswordSetupTokenInvalidError for a token that does not exist", async () => {
    await expect(
      useCase.execute({ token: "never-issued", password: "brandNewPass1" })
    ).rejects.toThrow(PasswordSetupTokenInvalidError);
  });

  it("throws PasswordSetupTokenInvalidError for an already-consumed token", async () => {
    const rawToken = "raw-token-456";
    const record = await tokenRepo.create({
      userId: "user-1",
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() + 60_000),
    });
    await tokenRepo.markConsumed(record.id);

    await expect(
      useCase.execute({ token: rawToken, password: "brandNewPass1" })
    ).rejects.toThrow(PasswordSetupTokenInvalidError);
  });

  it("throws PasswordSetupTokenExpiredError for an expired token", async () => {
    const rawToken = "raw-token-789";
    await tokenRepo.create({
      userId: "user-1",
      tokenHash: hashToken(rawToken),
      expiresAt: new Date(Date.now() - 1_000),
    });

    await expect(
      useCase.execute({ token: rawToken, password: "brandNewPass1" })
    ).rejects.toThrow(PasswordSetupTokenExpiredError);
  });

  it("does not modify the password when the token is invalid", async () => {
    await expect(
      useCase.execute({ token: "bogus", password: "brandNewPass1" })
    ).rejects.toThrow();
    const user = await userRepo.findById("user-1");
    expect(user?.passwordHash).toBeNull();
  });
});
