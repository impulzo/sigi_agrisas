import { AssignRoleToUserUseCase } from "@/modules/rbac/application/use-cases/AssignRoleToUserUseCase";
import { RevokeRoleFromUserUseCase } from "@/modules/rbac/application/use-cases/RevokeRoleFromUserUseCase";
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
  const assignUC = new AssignRoleToUserUseCase(roleRepo, userRoleRepo, authz);
  const revokeUC = new RevokeRoleFromUserUseCase(roleRepo, userRoleRepo, authz);
  return { roleRepo, userRoleRepo, assignUC, revokeUC };
}

describe("RevokeRoleFromUserUseCase", () => {
  it("revoca un rol asignado", async () => {
    const { roleRepo, userRoleRepo, assignUC, revokeUC } = setup();
    await roleRepo.save(role);
    await assignUC.execute("user-1", "viewer");
    await revokeUC.execute("user-1", "role-1");
    const roles = await userRoleRepo.listByUser("user-1");
    expect(roles).toHaveLength(0);
  });

  it("es idempotente (no falla si el rol no estaba asignado)", async () => {
    const { roleRepo, revokeUC } = setup();
    await roleRepo.save(role);
    await expect(revokeUC.execute("user-1", "role-1")).resolves.not.toThrow();
  });

  it("lanza RoleNotFoundError si el rol no existe", async () => {
    const { revokeUC } = setup();
    await expect(revokeUC.execute("user-1", "inexistente")).rejects.toThrow(RoleNotFoundError);
  });
});
