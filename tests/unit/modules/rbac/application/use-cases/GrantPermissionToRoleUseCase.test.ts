import { GrantPermissionToRoleUseCase } from "@/modules/rbac/application/use-cases/GrantPermissionToRoleUseCase";
import { PermissionAlreadyGrantedError } from "@/modules/rbac/domain/errors/PermissionAlreadyGrantedError";
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
  const uc = new GrantPermissionToRoleUseCase(roleRepo, permRepo, rolePermRepo, authz);
  return { roleRepo, permRepo, rolePermRepo, uc };
}

describe("GrantPermissionToRoleUseCase", () => {
  it("concede un permiso a un rol", async () => {
    const { roleRepo, permRepo, rolePermRepo, uc } = setup();
    await roleRepo.save(role);
    await permRepo.save(perm);
    await uc.execute("role-1", "users:read");
    const perms = await rolePermRepo.listByRole("role-1");
    expect(perms[0].key).toBe("users:read");
  });

  it("lanza RoleNotFoundError si el rol no existe", async () => {
    const { permRepo, uc } = setup();
    await permRepo.save(perm);
    await expect(uc.execute("inexistente", "users:read")).rejects.toThrow(RoleNotFoundError);
  });

  it("lanza PermissionNotFoundError si el permiso no existe", async () => {
    const { roleRepo, uc } = setup();
    await roleRepo.save(role);
    await expect(uc.execute("role-1", "inexistente:perm")).rejects.toThrow(PermissionNotFoundError);
  });

  it("lanza PermissionAlreadyGrantedError al conceder duplicado", async () => {
    const { roleRepo, permRepo, uc } = setup();
    await roleRepo.save(role);
    await permRepo.save(perm);
    await uc.execute("role-1", "users:read");
    await expect(uc.execute("role-1", "users:read")).rejects.toThrow(PermissionAlreadyGrantedError);
  });
});
