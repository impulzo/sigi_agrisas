import { AssignRoleToUserUseCase } from "@/modules/rbac/application/use-cases/AssignRoleToUserUseCase";
import { GrantPermissionToRoleUseCase } from "@/modules/rbac/application/use-cases/GrantPermissionToRoleUseCase";
import { ListUserPermissionsUseCase } from "@/modules/rbac/application/use-cases/ListUserPermissionsUseCase";
import { Role } from "@/modules/rbac/domain/entities/Role";
import { Permission } from "@/modules/rbac/domain/entities/Permission";
import { InMemoryRoleRepository } from "../../_fixtures/InMemoryRoleRepository";
import { InMemoryPermissionRepository } from "../../_fixtures/InMemoryPermissionRepository";
import { InMemoryUserRoleRepository } from "../../_fixtures/InMemoryUserRoleRepository";
import { InMemoryRolePermissionRepository } from "../../_fixtures/InMemoryRolePermissionRepository";
import { InMemoryAuthorizationService } from "../../_fixtures/InMemoryAuthorizationService";

const now = new Date();

describe("ListUserPermissionsUseCase", () => {
  it("lista permisos de usuario con múltiples roles, deduplicando compartidos", async () => {
    const roleRepo = new InMemoryRoleRepository();
    const permRepo = new InMemoryPermissionRepository();
    const rolePermRepo = new InMemoryRolePermissionRepository(permRepo);
    const userRoleRepo = new InMemoryUserRoleRepository(roleRepo);
    const authz = new InMemoryAuthorizationService(userRoleRepo, rolePermRepo);
    const assignUC = new AssignRoleToUserUseCase(roleRepo, userRoleRepo, authz);
    const grantUC = new GrantPermissionToRoleUseCase(roleRepo, permRepo, rolePermRepo, authz);
    const listUC = new ListUserPermissionsUseCase(authz);

    const viewer = Role.create("role-v", { name: "viewer", createdAt: now, updatedAt: now });
    const operator = Role.create("role-o", { name: "operator", createdAt: now, updatedAt: now });
    const permRead = Permission.create("p-1", { key: "users:read", createdAt: now, updatedAt: now });
    const permWrite = Permission.create("p-2", { key: "users:write", createdAt: now, updatedAt: now });

    await roleRepo.save(viewer);
    await roleRepo.save(operator);
    await permRepo.save(permRead);
    await permRepo.save(permWrite);

    await grantUC.execute("role-v", "users:read");
    await grantUC.execute("role-o", "users:read");
    await grantUC.execute("role-o", "users:write");

    await assignUC.execute("user-1", "viewer");
    await assignUC.execute("user-1", "operator");

    const perms = await listUC.execute("user-1");
    expect(perms).toHaveLength(2);
    expect(perms).toContain("users:read");
    expect(perms).toContain("users:write");
  });
});
