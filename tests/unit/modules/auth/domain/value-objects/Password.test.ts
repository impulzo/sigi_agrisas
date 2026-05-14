import { Password } from "@/modules/auth/domain/value-objects/Password";

describe("Password value object", () => {
  it("creates a valid password", () => {
    const pwd = Password.create("securepass");
    expect(pwd.value).toBe("securepass");
  });

  it("throws when password is shorter than 8 chars", () => {
    expect(() => Password.create("short")).toThrow("at least 8");
  });

  it("allows exactly 8 characters", () => {
    expect(() => Password.create("12345678")).not.toThrow();
  });

  it("creates a password from hash without length check", () => {
    const pwd = Password.fromHash("$2b$10$short");
    expect(pwd.value).toBe("$2b$10$short");
  });
});
