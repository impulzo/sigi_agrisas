/**
 * Integration smoke test: RBAC para cotizaciones contra Supabase real
 * (tasks 12.1, 12.2, 12.3, 12.4).
 *
 * No levanta servidor HTTP — usa `PrismaAuthorizationService` directamente
 * para validar que las asignaciones del seed son correctas y que `userCan()`
 * resuelve con los nombres esperados para viewer/operator/admin.
 *
 * Cubre:
 *  - 12.1 viewer SÓLO tiene quotes:read (los otros 5 → false)
 *  - 12.2 operator tiene los 6 permisos de cotización
 *  - 12.3 admin tiene los 6 permisos de cotización + branches:access_all
 *  - 12.4 las 6 permissions están presentes en la tabla `permissions`
 *
 * Pre-requisito: la migración `20260531000001_add_quotes_tables_and_link_to_sale`
 * está aplicada y el seed de los 6 permisos `quotes:*` ya corrió contra esta DB.
 */
import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaAuthorizationService } from "@/modules/rbac/infrastructure/services/PrismaAuthorizationService";
import { UserRolePrismaRepository } from "@/modules/rbac/infrastructure/repositories/UserRolePrismaRepository";

jest.setTimeout(30000);

const P = "QUOTERBAC_";
const QUOTE_PERMISSIONS = [
  "quotes:read",
  "quotes:create",
  "quotes:write",
  "quotes:cancel",
  "quotes:authorize",
  "quotes:convert",
] as const;

async function cleanup() {
  await prisma.userRole.deleteMany({
    where: { user: { email: { startsWith: P } } },
  });
  await prisma.user.deleteMany({ where: { email: { startsWith: P } } });
}

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("Quotes — RBAC smoke (integration real DB)", () => {
  const userRoleRepo = new UserRolePrismaRepository(prisma);
  const authz = new PrismaAuthorizationService(prisma, userRoleRepo);

  let viewerId: string;
  let operatorId: string;
  let adminId: string;

  beforeAll(async () => {
    await cleanup();

    const viewer = await prisma.user.create({
      data: { email: `${P}viewer@test.com`, passwordHash: "x", name: "Viewer Smoke" },
    });
    viewerId = viewer.id;
    const operator = await prisma.user.create({
      data: { email: `${P}operator@test.com`, passwordHash: "x", name: "Operator Smoke" },
    });
    operatorId = operator.id;
    const admin = await prisma.user.create({
      data: { email: `${P}admin@test.com`, passwordHash: "x", name: "Admin Smoke" },
    });
    adminId = admin.id;

    const roles = await prisma.role.findMany({
      where: { name: { in: ["viewer", "operator", "admin"] } },
    });
    const roleByName = new Map(roles.map((r) => [r.name, r.id]));

    await prisma.userRole.createMany({
      data: [
        { userId: viewerId, roleId: roleByName.get("viewer")! },
        { userId: operatorId, roleId: roleByName.get("operator")! },
        { userId: adminId, roleId: roleByName.get("admin")! },
      ],
    });
  });

  describe("12.4 — las 6 permissions de cotización existen en la tabla `permissions`", () => {
    it("permissions table contiene los 6 quotes:*", async () => {
      const rows = await prisma.permission.findMany({
        where: { key: { in: [...QUOTE_PERMISSIONS] } },
        select: { key: true },
      });
      const keys = rows.map((r) => r.key).sort();
      expect(keys).toEqual([...QUOTE_PERMISSIONS].sort());
    });

    it("total de permisos del sistema ≥ 31 (25 previos + 6 nuevos)", async () => {
      const total = await prisma.permission.count();
      expect(total).toBeGreaterThanOrEqual(31);
    });
  });

  describe("12.1 — viewer", () => {
    it("tiene quotes:read", async () => {
      expect(await authz.userCan(viewerId, "quotes:read")).toBe(true);
    });

    it("NO tiene quotes:create", async () => {
      expect(await authz.userCan(viewerId, "quotes:create")).toBe(false);
    });

    it("NO tiene quotes:write", async () => {
      expect(await authz.userCan(viewerId, "quotes:write")).toBe(false);
    });

    it("NO tiene quotes:cancel", async () => {
      expect(await authz.userCan(viewerId, "quotes:cancel")).toBe(false);
    });

    it("NO tiene quotes:authorize", async () => {
      expect(await authz.userCan(viewerId, "quotes:authorize")).toBe(false);
    });

    it("NO tiene quotes:convert", async () => {
      expect(await authz.userCan(viewerId, "quotes:convert")).toBe(false);
    });

    it("NO tiene branches:access_all (no puede ver cotizaciones de otras sucursales)", async () => {
      expect(await authz.userCan(viewerId, "branches:access_all")).toBe(false);
    });
  });

  describe("12.2 — operator", () => {
    it("tiene los 6 permisos de cotización", async () => {
      for (const perm of QUOTE_PERMISSIONS) {
        expect(await authz.userCan(operatorId, perm)).toBe(true);
      }
    });

    it("NO tiene branches:access_all (queda scoped a su sucursal)", async () => {
      expect(await authz.userCan(operatorId, "branches:access_all")).toBe(false);
    });
  });

  describe("12.3 — admin", () => {
    it("tiene los 6 permisos de cotización", async () => {
      for (const perm of QUOTE_PERMISSIONS) {
        expect(await authz.userCan(adminId, perm)).toBe(true);
      }
    });

    it("tiene branches:access_all (puede operar en cualquier sucursal)", async () => {
      expect(await authz.userCan(adminId, "branches:access_all")).toBe(true);
    });
  });

  describe("listUserPermissions snapshot", () => {
    it("viewer incluye quotes:read y NO quotes:write/create/cancel/authorize/convert", async () => {
      const perms = new Set(await authz.listUserPermissions(viewerId));
      expect(perms.has("quotes:read")).toBe(true);
      expect(perms.has("quotes:write")).toBe(false);
      expect(perms.has("quotes:create")).toBe(false);
      expect(perms.has("quotes:cancel")).toBe(false);
      expect(perms.has("quotes:authorize")).toBe(false);
      expect(perms.has("quotes:convert")).toBe(false);
    });

    it("operator incluye los 6 quotes:*", async () => {
      const perms = new Set(await authz.listUserPermissions(operatorId));
      for (const perm of QUOTE_PERMISSIONS) expect(perms.has(perm)).toBe(true);
    });

    it("admin incluye los 6 quotes:* y branches:access_all", async () => {
      const perms = new Set(await authz.listUserPermissions(adminId));
      for (const perm of QUOTE_PERMISSIONS) expect(perms.has(perm)).toBe(true);
      expect(perms.has("branches:access_all")).toBe(true);
    });
  });
});
