import { User } from "@/modules/auth/domain/entities/User";

describe("User entity", () => {
  const props = {
    email: "test@example.com",
    passwordHash: "hashed",
    roles: [],
    branchId: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  it("creates a user with correct properties", () => {
    const user = User.create("uuid-1", props);
    expect(user.id).toBe("uuid-1");
    expect(user.email).toBe("test@example.com");
    expect(user.passwordHash).toBe("hashed");
  });

  it("two users with same id are equal", () => {
    const a = User.create("uuid-1", props);
    const b = User.create("uuid-1", props);
    expect(a.equals(b)).toBe(true);
  });

  it("two users with different ids are not equal", () => {
    const a = User.create("uuid-1", props);
    const b = User.create("uuid-2", props);
    expect(a.equals(b)).toBe(false);
  });
});
