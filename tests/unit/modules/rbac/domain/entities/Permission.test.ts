import { Permission } from "@/modules/rbac/domain/entities/Permission";

const now = new Date();

describe("Permission", () => {
  it("crea una entidad con los campos correctos", () => {
    const perm = Permission.create("id-1", { key: "users:read", createdAt: now, updatedAt: now });
    expect(perm.id).toBe("id-1");
    expect(perm.key).toBe("users:read");
  });

  it("dos entidades con el mismo id son iguales", () => {
    const p1 = Permission.create("id-1", { key: "users:read", createdAt: now, updatedAt: now });
    const p2 = Permission.create("id-1", { key: "users:write", createdAt: now, updatedAt: now });
    expect(p1.equals(p2)).toBe(true);
  });

  it("dos entidades con distinto id son distintas", () => {
    const p1 = Permission.create("id-1", { key: "users:read", createdAt: now, updatedAt: now });
    const p2 = Permission.create("id-2", { key: "users:read", createdAt: now, updatedAt: now });
    expect(p1.equals(p2)).toBe(false);
  });
});
