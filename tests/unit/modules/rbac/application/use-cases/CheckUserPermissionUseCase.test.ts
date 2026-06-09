import { AssignRoleToUserUseCase } from "@/modules/rbac/application/use-cases/AssignRoleToUserUseCase";
import { GrantPermissionToRoleUseCase } from "@/modules/rbac/application/use-cases/GrantPermissionToRoleUseCase";
import { CheckUserPermissionUseCase } from "@/modules/rbac/application/use-cases/CheckUserPermissionUseCase";
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

async function setupWithRoleAndPerm() {
  const roleRepo = new InMemoryRoleRepository();
  const permRepo = new InMemoryPermissionRepository();
  const rolePermRepo = new InMemoryRolePermissionRepository(permRepo);
  const userRoleRepo = new InMemoryUserRoleRepository(roleRepo);
  const authz = new InMemoryAuthorizationService(userRoleRepo, rolePermRepo);
  const assignUC = new AssignRoleToUserUseCase(roleRepo, userRoleRepo, authz);
  const grantUC = new GrantPermissionToRoleUseCase(roleRepo, permRepo, rolePermRepo, authz);
  const checkUC = new CheckUserPermissionUseCase(authz);

  await roleRepo.save(role);
  await permRepo.save(perm);
  await grantUC.execute("role-1", "users:read");

  return { assignUC, checkUC };
}

describe("CheckUserPermissionUseCase", () => {
  it("devuelve true si el usuario tiene el permiso a través de su rol", async () => {
    const { assignUC, checkUC } = await setupWithRoleAndPerm();
    await assignUC.execute("user-1", "viewer");
    expect(await checkUC.execute("user-1", "users:read")).toBe(true);
  });

  it("devuelve false si el usuario no tiene el rol", async () => {
    const { checkUC } = await setupWithRoleAndPerm();
    expect(await checkUC.execute("user-sin-rol", "users:read")).toBe(false);
  });

  it("devuelve false si el permiso no existe en el rol del usuario", async () => {
    const { assignUC, checkUC } = await setupWithRoleAndPerm();
    await assignUC.execute("user-1", "viewer");
    expect(await checkUC.execute("user-1", "roles:write")).toBe(false);
  });
});
