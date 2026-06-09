import { Role } from "@/modules/rbac/domain/entities/Role";

const now = new Date();

describe("Role", () => {
  it("crea una entidad con los campos correctos", () => {
    const role = Role.create("id-1", { name: "admin", createdAt: now, updatedAt: now });
    expect(role.id).toBe("id-1");
    expect(role.name).toBe("admin");
    expect(role.createdAt).toBe(now);
  });

  it("dos entidades con el mismo id son iguales", () => {
    const r1 = Role.create("id-1", { name: "admin", createdAt: now, updatedAt: now });
    const r2 = Role.create("id-1", { name: "viewer", createdAt: now, updatedAt: now });
    expect(r1.equals(r2)).toBe(true);
  });

  it("dos entidades con distinto id son distintas", () => {
    const r1 = Role.create("id-1", { name: "admin", createdAt: now, updatedAt: now });
    const r2 = Role.create("id-2", { name: "admin", createdAt: now, updatedAt: now });
    expect(r1.equals(r2)).toBe(false);
  });
});
