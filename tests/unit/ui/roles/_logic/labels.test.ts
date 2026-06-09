import { getPermissionGroupLabel, PERMISSION_GROUP_LABELS } from "../../../../../app/(private)/roles/_logic/labels";

describe("getPermissionGroupLabel", () => {
  it("returns Spanish label for known resources", () => {
    expect(getPermissionGroupLabel("users")).toBe("Usuarios");
    expect(getPermissionGroupLabel("roles")).toBe("Roles y Permisos");
    expect(getPermissionGroupLabel("inventory")).toBe("Inventario");
    expect(getPermissionGroupLabel("billing")).toBe("Facturación");
    expect(getPermissionGroupLabel("pos")).toBe("Punto de Venta");
  });

  it("capitalizes the first letter of unknown resources", () => {
    expect(getPermissionGroupLabel("unknown")).toBe("Unknown");
    expect(getPermissionGroupLabel("custom_module")).toBe("Custom_module");
  });

  it("PERMISSION_GROUP_LABELS covers all expected resources", () => {
    const expected = ["users", "roles", "inventory", "billing", "pos", "reports", "settings"];
    expected.forEach((key) => {
      expect(PERMISSION_GROUP_LABELS).toHaveProperty(key);
    });
  });
});
