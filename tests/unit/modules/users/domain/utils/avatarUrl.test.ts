import { resolveAvatarUrl } from "@/modules/users/domain/utils/avatarUrl";

describe("resolveAvatarUrl", () => {
  it("devuelve URL de Gravatar cuando stored es null", () => {
    const url = resolveAvatarUrl("Test@Example.COM", null);
    expect(url).toMatch(/^https:\/\/www\.gravatar\.com\/avatar\/[a-f0-9]{32}\?d=mp&s=200$/);
  });

  it("el hash es MD5 del email en minúsculas sin espacios", () => {
    // MD5 de "test@example.com" = 55502f40dc8b7c769880b10874abc9d0
    const url = resolveAvatarUrl("Test@Example.COM  ", null);
    expect(url).toContain("55502f40dc8b7c769880b10874abc9d0");
  });

  it("devuelve la URL almacenada cuando stored no es null", () => {
    const custom = "https://example.com/photo.jpg";
    expect(resolveAvatarUrl("user@test.com", custom)).toBe(custom);
  });

  it("devuelve string vacío almacenado sin sobreescribir", () => {
    expect(resolveAvatarUrl("user@test.com", "")).toBe("");
  });
});
