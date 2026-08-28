import { InMemoryUserRepository } from "@/modules/auth/infrastructure/repositories/InMemoryUserRepository";
import { User } from "@/modules/auth/domain/entities/User";

const makeUser = (id = "id-1", email = "a@b.com") =>
  User.create(id, {
    email,
    passwordHash: "hash",
    roles: [],
    branchId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

describe("InMemoryUserRepository", () => {
  let repo: InMemoryUserRepository;

  beforeEach(() => {
    repo = new InMemoryUserRepository();
  });

  it("saves and finds a user by email", async () => {
    const user = makeUser();
    await repo.save(user);
    const found = await repo.findByEmail("a@b.com");
    expect(found?.id).toBe("id-1");
  });

  it("returns null when email not found", async () => {
    const result = await repo.findByEmail("missing@b.com");
    expect(result).toBeNull();
  });

  it("saves and finds a user by id", async () => {
    const user = makeUser();
    await repo.save(user);
    const found = await repo.findById("id-1");
    expect(found?.email).toBe("a@b.com");
  });

  it("returns null when id not found", async () => {
    const result = await repo.findById("missing-id");
    expect(result).toBeNull();
  });

  it("overwrites user on second save with same id", async () => {
    const user = makeUser("id-1", "first@b.com");
    await repo.save(user);
    const updated = makeUser("id-1", "updated@b.com");
    await repo.save(updated);
    const found = await repo.findById("id-1");
    expect(found?.email).toBe("updated@b.com");
  });

  it("updatePasswordHash sets the new hash and preserves other fields", async () => {
    const user = makeUser();
    await repo.save(user);
    await repo.updatePasswordHash("id-1", "new-hash");
    const found = await repo.findById("id-1");
    expect(found?.passwordHash).toBe("new-hash");
    expect(found?.email).toBe("a@b.com");
  });

  it("updatePasswordHash is a no-op when the user does not exist", async () => {
    await expect(repo.updatePasswordHash("missing-id", "new-hash")).resolves.toBeUndefined();
  });
});
