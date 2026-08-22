import { CreateRoleUseCase } from "@/modules/rbac/application/use-cases/CreateRoleUseCase";
import { RoleAlreadyExistsError } from "@/modules/rbac/domain/errors/RoleAlreadyExistsError";
import { InvalidRoleNameError } from "@/modules/rbac/domain/errors/InvalidRoleNameError";
import { InMemoryRoleRepository } from "../../_fixtures/InMemoryRoleRepository";

function setup() {
  const roleRepo = new InMemoryRoleRepository();
  const uc = new CreateRoleUseCase(roleRepo);
  return { roleRepo, uc };
}

describe("CreateRoleUseCase", () => {
  it("crea un rol nuevo con nombre y descripción válidos", async () => {
    const { roleRepo, uc } = setup();
    const role = await uc.execute({ name: "supervisor_almacen", description: "Supervisor de almacén" });
    expect(role.name).toBe("supervisor_almacen");
    expect(role.description).toBe("Supervisor de almacén");
    const saved = await roleRepo.findByName("supervisor_almacen");
    expect(saved?.id).toBe(role.id);
  });

  it("crea un rol sin descripción (opcional)", async () => {
    const { uc } = setup();
    const role = await uc.execute({ name: "operator2" });
    expect(role.description).toBeUndefined();
  });

  it("lanza InvalidRoleNameError con nombre inválido", async () => {
    const { uc } = setup();
    await expect(uc.execute({ name: "Supervisor Almacen" })).rejects.toThrow(InvalidRoleNameError);
  });

  it("lanza RoleAlreadyExistsError con nombre duplicado", async () => {
    const { uc } = setup();
    await uc.execute({ name: "duplicado" });
    await expect(uc.execute({ name: "duplicado" })).rejects.toThrow(RoleAlreadyExistsError);
  });
});
