import { LoginUseCase } from "@/modules/auth/application/use-cases/LoginUseCase";
import { InMemoryUserRepository } from "@/modules/auth/infrastructure/repositories/InMemoryUserRepository";
import { PasswordHasher } from "@/modules/auth/application/ports/PasswordHasher";
import { TokenService, TokenPayload } from "@/modules/auth/application/ports/TokenService";
import { InvalidCredentialsError } from "@/modules/auth/domain/errors/InvalidCredentialsError";
import { PasswordNotSetError } from "@/modules/auth/domain/errors/PasswordNotSetError";
import { User } from "@/modules/auth/domain/entities/User";

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

describe("LoginUseCase", () => {
  let repo: InMemoryUserRepository;
  let useCase: LoginUseCase;

  beforeEach(async () => {
    repo = new InMemoryUserRepository();
    useCase = new LoginUseCase(repo, fakeHasher, fakeTokenService);

    const now = new Date();
    await repo.save(
      User.create("user-1", {
        email: "user@example.com",
        passwordHash: "hashed:correctpass",
        roles: [],
        branchId: null,
        createdAt: now,
        updatedAt: now,
      })
    );
  });

  it("returns tokens on successful login", async () => {
    const result = await useCase.execute({
      email: "user@example.com",
      password: "correctpass",
    });
    expect(result.accessToken).toBe("access:user-1");
    expect(result.refreshToken).toBe("refresh:user-1");
    expect(result.user.email).toBe("user@example.com");
  });

  it("throws InvalidCredentialsError for wrong password", async () => {
    await expect(
      useCase.execute({ email: "user@example.com", password: "wrong" })
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it("throws InvalidCredentialsError for non-existent user", async () => {
    await expect(
      useCase.execute({ email: "nobody@example.com", password: "pass" })
    ).rejects.toThrow(InvalidCredentialsError);
  });

  it("throws PasswordNotSetError without calling hasher.compare when passwordHash is null", async () => {
    const now = new Date();
    await repo.save(
      User.create("user-2", {
        email: "invited@example.com",
        passwordHash: null,
        roles: [],
        branchId: null,
        createdAt: now,
        updatedAt: now,
      })
    );
    const compareSpy = jest.spyOn(fakeHasher, "compare");

    await expect(
      useCase.execute({ email: "invited@example.com", password: "anything" })
    ).rejects.toThrow(PasswordNotSetError);
    expect(compareSpy).not.toHaveBeenCalled();
  });
});
