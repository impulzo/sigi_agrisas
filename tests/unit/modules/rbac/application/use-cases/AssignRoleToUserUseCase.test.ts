import { AssignRoleToUserUseCase } from "@/modules/rbac/application/use-cases/AssignRoleToUserUseCase";
import { RoleAlreadyAssignedError } from "@/modules/rbac/domain/errors/RoleAlreadyAssignedError";
import { RoleNotFoundError } from "@/modules/rbac/domain/errors/RoleNotFoundError";
import { Role } from "@/modules/rbac/domain/entities/Role";
import { InMemoryRoleRepository } from "../../_fixtures/InMemoryRoleRepository";
import { InMemoryUserRoleRepository } from "../../_fixtures/InMemoryUserRoleRepository";
import { InMemoryAuthorizationService } from "../../_fixtures/InMemoryAuthorizationService";
import { InMemoryPermissionRepository } from "../../_fixtures/InMemoryPermissionRepository";
import { InMemoryRolePermissionRepository } from "../../_fixtures/InMemoryRolePermissionRepository";

const now = new Date();
const role = Role.create("role-1", { name: "viewer", createdAt: now, updatedAt: now });

function setup() {
  const roleRepo = new InMemoryRoleRepository();
  const permRepo = new InMemoryPermissionRepository();
  const rolePermRepo = new InMemoryRolePermissionRepository(permRepo);
  const userRoleRepo = new InMemoryUserRoleRepository(roleRepo);
  const authz = new InMemoryAuthorizationService(userRoleRepo, rolePermRepo);
  const uc = new AssignRoleToUserUseCase(roleRepo, userRoleRepo, authz);
  return { roleRepo, userRoleRepo, uc };
}

describe("AssignRoleToUserUseCase", () => {
  it("asigna un rol existente al usuario", async () => {
    const { roleRepo, userRoleRepo, uc } = setup();
    await roleRepo.save(role);
    await uc.execute("user-1", "viewer");
    const roles = await userRoleRepo.listByUser("user-1");
    expect(roles[0].id).toBe("role-1");
  });

  it("lanza RoleNotFoundError si el rol no existe", async () => {
    const { uc } = setup();
    await expect(uc.execute("user-1", "inexistente")).rejects.toThrow(RoleNotFoundError);
  });

  it("lanza RoleAlreadyAssignedError al asignar duplicado", async () => {
    const { roleRepo, uc } = setup();
    await roleRepo.save(role);
    await uc.execute("user-1", "viewer");
    await expect(uc.execute("user-1", "viewer")).rejects.toThrow(RoleAlreadyAssignedError);
  });
});
