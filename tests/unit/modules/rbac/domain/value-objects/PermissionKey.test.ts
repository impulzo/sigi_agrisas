import { PermissionKey } from "@/modules/rbac/domain/value-objects/PermissionKey";
import { InvalidPermissionKeyError } from "@/modules/rbac/domain/errors/InvalidPermissionKeyError";

describe("PermissionKey", () => {
  it("acepta formato válido resource:action", () => {
    expect(PermissionKey.create("users:read").value).toBe("users:read");
    expect(PermissionKey.create("roles:write").value).toBe("roles:write");
    expect(PermissionKey.create("fincas:delete").value).toBe("fincas:delete");
  });

  it("rechaza clave sin dos puntos", () => {
    expect(() => PermissionKey.create("usersread")).toThrow(InvalidPermissionKeyError);
  });

  it("rechaza clave con doble dos puntos", () => {
    expect(() => PermissionKey.create("users:read:extra")).toThrow(InvalidPermissionKeyError);
  });

  it("rechaza clave vacía", () => {
    expect(() => PermissionKey.create("")).toThrow(InvalidPermissionKeyError);
  });

  it("rechaza parte que empieza con dígito", () => {
    expect(() => PermissionKey.create("1users:read")).toThrow(InvalidPermissionKeyError);
    expect(() => PermissionKey.create("users:1read")).toThrow(InvalidPermissionKeyError);
  });
});
