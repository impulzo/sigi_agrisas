import { RoleName } from "@/modules/rbac/domain/value-objects/RoleName";
import { InvalidRoleNameError } from "@/modules/rbac/domain/errors/InvalidRoleNameError";

describe("RoleName", () => {
  it("acepta nombres válidos", () => {
    expect(RoleName.create("admin").value).toBe("admin");
    expect(RoleName.create("op_erator").value).toBe("op_erator");
    expect(RoleName.create("vi2").value).toBe("vi2");
  });

  it("rechaza nombres con mayúsculas", () => {
    expect(() => RoleName.create("Admin")).toThrow(InvalidRoleNameError);
    expect(() => RoleName.create("ADMIN")).toThrow(InvalidRoleNameError);
  });

  it("rechaza nombre vacío", () => {
    expect(() => RoleName.create("")).toThrow(InvalidRoleNameError);
  });

  it("rechaza nombre de un solo carácter (menos de 2)", () => {
    expect(() => RoleName.create("a")).toThrow(InvalidRoleNameError);
  });

  it("rechaza nombre de más de 32 caracteres", () => {
    expect(() => RoleName.create("a".repeat(33))).toThrow(InvalidRoleNameError);
  });

  it("rechaza nombres que empiezan con dígito", () => {
    expect(() => RoleName.create("1admin")).toThrow(InvalidRoleNameError);
  });
});
