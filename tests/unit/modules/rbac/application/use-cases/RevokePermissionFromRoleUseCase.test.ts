import { GrantPermissionToRoleUseCase } from "@/modules/rbac/application/use-cases/GrantPermissionToRoleUseCase";
import { RevokePermissionFromRoleUseCase } from "@/modules/rbac/application/use-cases/RevokePermissionFromRoleUseCase";
import { RoleNotFoundError } from "@/modules/rbac/domain/errors/RoleNotFoundError";
import { PermissionNotFoundError } from "@/modules/rbac/domain/errors/PermissionNotFoundError";
import { Role } from "@/modules/rbac/domain/entities/Role";
import { Permission } from "@/modules/rbac/domain/entities/Permission";
import { InMemoryRoleRepository } from "../../_fixtures/InMemoryRoleRepository";
import { InMemoryPermissionRepository } from "../../_fixtures/InMemoryPermissionRepository";
import { InMemoryUserRoleRepository } from "../../_fixtures/InMemoryUserRoleRepository";
import { InMemoryRolePermissionRepository } from "../../_fixtures/InMemoryRolePermissionRepository";
import { InMemoryAuthorizationService } from "../../_fixtures/InMemoryAuthorizationService";

const now = new Date();
const role = Role.create("role-1", { name: "viewer", createdAt: now, updatedAt: now });
const perm = Permission.create("perm-1", { key: "users:read", createdAt: now, updatedAt: now });

function setup() {
  const roleRepo = new InMemoryRoleRepository();
  const permRepo = new InMemoryPermissionRepository();
  const rolePermRepo = new InMemoryRolePermissionRepository(permRepo);
  const userRoleRepo = new InMemoryUserRoleRepository(roleRepo);
  const authz = new InMemoryAuthorizationService(userRoleRepo, rolePermRepo);
  const grantUC = new GrantPermissionToRoleUseCase(roleRepo, permRepo, rolePermRepo, authz);
  const revokeUC = new RevokePermissionFromRoleUseCase(roleRepo, permRepo, rolePermRepo, authz);
  return { roleRepo, permRepo, rolePermRepo, grantUC, revokeUC };
}

describe("RevokePermissionFromRoleUseCase", () => {
  it("revoca un permiso concedido", async () => {
    const { roleRepo, permRepo, rolePermRepo, grantUC, revokeUC } = setup();
    await roleRepo.save(role);
    await permRepo.save(perm);
    await grantUC.execute("role-1", "users:read");
    await revokeUC.execute("role-1", "perm-1");
    const perms = await rolePermRepo.listByRole("role-1");
    expect(perms).toHaveLength(0);
  });

  it("lanza RoleNotFoundError si el rol no existe", async () => {
    const { permRepo, revokeUC } = setup();
    await permRepo.save(perm);
    await expect(revokeUC.execute("inexistente", "perm-1")).rejects.toThrow(RoleNotFoundError);
  });

  it("lanza PermissionNotFoundError si el permiso no existe", async () => {
    const { roleRepo, revokeUC } = setup();
    await roleRepo.save(role);
    await expect(revokeUC.execute("role-1", "inexistente")).rejects.toThrow(PermissionNotFoundError);
  });
});
