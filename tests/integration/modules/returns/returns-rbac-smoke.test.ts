/**
 * Integration smoke test: RBAC para devoluciones contra Supabase real (task 11.4).
 *
 * Usa `PrismaAuthorizationService` directamente para validar que las
 * asignaciones del seed son correctas y que `userCan()` resuelve con los
 * nombres esperados para viewer/operator/admin.
 *
 * Pre-requisito: la migración `add_returns_tables` está aplicada y el seed
 * de los 3 permisos `returns:*` ya corrió contra esta DB (`npm run seed`).
 */
import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaAuthorizationService } from "@/modules/rbac/infrastructure/services/PrismaAuthorizationService";
import { UserRolePrismaRepository } from "@/modules/rbac/infrastructure/repositories/UserRolePrismaRepository";

jest.setTimeout(30000);

const P = "RETRBAC_";
const RETURN_PERMISSIONS = ["returns:read", "returns:create", "returns:cancel"] as const;

async function cleanup() {
  await prisma.userRole.deleteMany({ where: { user: { email: { startsWith: P } } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: P } } });
}

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("Returns — RBAC smoke (integration real DB)", () => {
  const userRoleRepo = new UserRolePrismaRepository(prisma);
  const authz = new PrismaAuthorizationService(prisma, userRoleRepo);

  let viewerId: string;
  let operatorId: string;
  let adminId: string;

  beforeAll(async () => {
    await cleanup();

    const viewer = await prisma.user.create({
      data: { email: `${P}viewer@test.com`, passwordHash: "x", name: "Viewer Returns" },
    });
    viewerId = viewer.id;
    const operator = await prisma.user.create({
      data: { email: `${P}operator@test.com`, passwordHash: "x", name: "Operator Returns" },
    });
    operatorId = operator.id;
    const admin = await prisma.user.create({
      data: { email: `${P}admin@test.com`, passwordHash: "x", name: "Admin Returns" },
    });
    adminId = admin.id;

    const roles = await prisma.role.findMany({ where: { name: { in: ["viewer", "operator", "admin"] } } });
    const roleByName = new Map(roles.map((r) => [r.name, r.id]));

    await prisma.userRole.createMany({
      data: [
        { userId: viewerId, roleId: roleByName.get("viewer")! },
        { userId: operatorId, roleId: roleByName.get("operator")! },
        { userId: adminId, roleId: roleByName.get("admin")! },
      ],
    });
  });

  describe("permissions table", () => {
    it("contiene los 3 returns:*", async () => {
      const rows = await prisma.permission.findMany({
        where: { key: { in: [...RETURN_PERMISSIONS] } },
        select: { key: true },
      });
      expect(rows.map((r) => r.key).sort()).toEqual([...RETURN_PERMISSIONS].sort());
    });

    it("total de permisos del sistema ≥ 34", async () => {
      const total = await prisma.permission.count();
      expect(total).toBeGreaterThanOrEqual(34);
    });
  });

  describe("viewer", () => {
    it("tiene returns:read", async () => {
      expect(await authz.userCan(viewerId, "returns:read")).toBe(true);
    });
    it("NO tiene returns:create", async () => {
      expect(await authz.userCan(viewerId, "returns:create")).toBe(false);
    });
    it("NO tiene returns:cancel", async () => {
      expect(await authz.userCan(viewerId, "returns:cancel")).toBe(false);
    });
    it("NO tiene branches:access_all", async () => {
      expect(await authz.userCan(viewerId, "branches:access_all")).toBe(false);
    });
  });

  describe("operator", () => {
    it("tiene los 3 permisos de devoluciones", async () => {
      for (const perm of RETURN_PERMISSIONS) {
        expect(await authz.userCan(operatorId, perm)).toBe(true);
      }
    });
    it("NO tiene branches:access_all (scoped a su sucursal)", async () => {
      expect(await authz.userCan(operatorId, "branches:access_all")).toBe(false);
    });
  });

  describe("admin", () => {
    it("tiene los 3 permisos de devoluciones", async () => {
      for (const perm of RETURN_PERMISSIONS) {
        expect(await authz.userCan(adminId, perm)).toBe(true);
      }
    });
    it("tiene branches:access_all", async () => {
      expect(await authz.userCan(adminId, "branches:access_all")).toBe(true);
    });
  });
});
