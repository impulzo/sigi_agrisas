import { RegisterUseCase } from "@/modules/auth/application/use-cases/RegisterUseCase";
import { InMemoryUserRepository } from "@/modules/auth/infrastructure/repositories/InMemoryUserRepository";
import { PasswordHasher } from "@/modules/auth/application/ports/PasswordHasher";
import { TokenService } from "@/modules/auth/application/ports/TokenService";
import { RoleAssigner } from "@/modules/rbac/application/ports/RoleAssigner";
import { EmailAlreadyInUseError } from "@/modules/auth/domain/errors/EmailAlreadyInUseError";

const fakeHasher: PasswordHasher = {
  hash: async (p) => `hashed:${p}`,
  compare: async (p, h) => h === `hashed:${p}`,
};

const fakeTokenService: TokenService = {
  generateAccessToken: () => "access-tok",
  generateRefreshToken: () => "refresh-tok",
  verifyAccessToken: () => ({ sub: "id", email: "e@e.com" }),
  verifyRefreshToken: () => ({ sub: "id", email: "e@e.com" }),
};

const fakeRoleAssigner: RoleAssigner = {
  assignDefaultRole: async () => {},
};

describe("RegisterUseCase", () => {
  let repo: InMemoryUserRepository;
  let useCase: RegisterUseCase;

  beforeEach(() => {
    repo = new InMemoryUserRepository();
    useCase = new RegisterUseCase(repo, fakeHasher, fakeTokenService, fakeRoleAssigner);
  });

  it("registers a new user and returns tokens", async () => {
    const result = await useCase.execute({
      name: "Alice",
      email: "user@example.com",
      password: "password1",
    });
    expect(result.user.email).toBe("user@example.com");
    expect(result.user.name).toBe("Alice");
    expect(result.user.id).toBeDefined();
    expect(result.accessToken).toBe("access-tok");
    expect(result.refreshToken).toBe("refresh-tok");
  });

  it("throws EmailAlreadyInUseError for duplicate email", async () => {
    await useCase.execute({ name: "Alice", email: "dup@example.com", password: "password1" });
    await expect(
      useCase.execute({ name: "Alice", email: "dup@example.com", password: "password2" })
    ).rejects.toThrow(EmailAlreadyInUseError);
  });

  it("throws on invalid email format", async () => {
    await expect(
      useCase.execute({ name: "Alice", email: "bad-email", password: "password1" })
    ).rejects.toThrow("Invalid email");
  });

  it("throws on password shorter than 8 chars", async () => {
    await expect(
      useCase.execute({ name: "Alice", email: "a@b.com", password: "short" })
    ).rejects.toThrow("at least 8");
  });

  it("stores hashed password, not plain text", async () => {
    await useCase.execute({ name: "Alice", email: "a@b.com", password: "securepass" });
    const user = await repo.findByEmail("a@b.com");
    expect(user?.passwordHash).toBe("hashed:securepass");
  });
});
