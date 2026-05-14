import { Email } from "@/modules/auth/domain/value-objects/Email";

describe("Email value object", () => {
  it("creates a valid email and normalizes to lowercase", () => {
    const email = Email.create("Test@Example.COM");
    expect(email.value).toBe("test@example.com");
  });

  it("throws on invalid email format", () => {
    expect(() => Email.create("not-an-email")).toThrow("Invalid email");
  });

  it("throws on empty string", () => {
    expect(() => Email.create("")).toThrow();
  });

  it("two emails with same value are equal", () => {
    const a = Email.create("a@b.com");
    const b = Email.create("A@B.com");
    expect(a.equals(b)).toBe(true);
  });
});
