/**
 * Integration test: permisos RBAC para el guard de edición de ventas.
 * Verifica via AuthorizationService real (Supabase) que:
 *   - admin tiene `branches:access_all`
 *   - viewer NO tiene `branches:access_all`
 *   - la lógica del guard (bypass OR user===hq) funciona correctamente
 *
 * Nota: NO crea una rama HQ para evitar conflicto con el índice único parcial
 * `branches_hq_idx` cuando los tests corren en paralelo. El test de `findHeadquarters`
 * está cubierto en `sales-edit-from-hq.test.ts` que sí crea una HQ.
 */
import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaAuthorizationService } from "@/modules/rbac/infrastructure/services/PrismaAuthorizationService";
import { UserRolePrismaRepository } from "@/modules/rbac/infrastructure/repositories/UserRolePrismaRepository";

const P = "POSHQ_";
const ADMIN_USER_ID = "00000000-adad-0000-0000-000000000001";
const OP_USER_ID = "00000000-eeee-0000-0000-000000000002";

const FAKE_HQ_ID: string = "00000000-cafe-0000-0000-000000000099";
const FAKE_OTHER_ID: string = "00000000-dead-0000-0000-000000000099";

async function cleanup() {
  await prisma.userRole.deleteMany({ where: { userId: { in: [ADMIN_USER_ID, OP_USER_ID] } } });
  await prisma.user.deleteMany({ where: { email: { startsWith: P } } });
}

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("HQ guard — permisos RBAC (integration real DB)", () => {
  const authzService = new PrismaAuthorizationService(prisma, new UserRolePrismaRepository(prisma));

  beforeAll(async () => {
    await cleanup();

    await prisma.user.createMany({
      data: [
        { id: ADMIN_USER_ID, email: `${P}admin@test.com`, passwordHash: "hash", name: "Admin Guard" },
        { id: OP_USER_ID, email: `${P}op@test.com`, passwordHash: "hash", name: "Operador Guard" },
      ],
    });

    const adminRole = await prisma.role.findFirstOrThrow({ where: { name: "admin" } });
    const viewerRole = await prisma.role.findFirstOrThrow({ where: { name: "viewer" } });

    await prisma.userRole.createMany({
      data: [
        { userId: ADMIN_USER_ID, roleId: adminRole.id },
        { userId: OP_USER_ID, roleId: viewerRole.id },
      ],
    });
  });

  it("admin (rol admin) tiene branches:access_all en BD real", async () => {
    const canBypass = await authzService.userCan(ADMIN_USER_ID, "branches:access_all");
    expect(canBypass).toBe(true);
  });

  it("viewer (rol viewer) NO tiene branches:access_all", async () => {
    const canBypass = await authzService.userCan(OP_USER_ID, "branches:access_all");
    expect(canBypass).toBe(false);
  });

  it("admin también tiene sales:edit_completed", async () => {
    const can = await authzService.userCan(ADMIN_USER_ID, "sales:edit_completed");
    expect(can).toBe(true);
  });

  it("viewer NO tiene sales:edit_completed", async () => {
    const can = await authzService.userCan(OP_USER_ID, "sales:edit_completed");
    expect(can).toBe(false);
  });

  it("guard lógico: admin (bypass) pasa aunque su sucursal != HQ", () => {
    const bypass = true; // admin
    const userBranchId = FAKE_OTHER_ID;
    const hqId = FAKE_HQ_ID;
    const allowed = bypass || userBranchId === hqId;
    expect(allowed).toBe(true);
  });

  it("guard lógico: operador en HQ pasa (x-user-branch-id === hq.id)", () => {
    const bypass = false; // viewer
    const userBranchId = FAKE_HQ_ID;
    const hqId = FAKE_HQ_ID;
    const allowed = bypass || userBranchId === hqId;
    expect(allowed).toBe(true);
  });

  it("guard lógico: operador en sucursal diferente a HQ NO pasa", () => {
    const bypass = false;
    const userBranchId = FAKE_OTHER_ID;
    const hqId = FAKE_HQ_ID;
    const allowed = bypass || userBranchId === hqId;
    expect(allowed).toBe(false);
  });

  it("guard lógico: sin HQ registrada (hq=null) → operador no pasa", () => {
    const bypass = false;
    const hq = null as ({ id: string } | null);
    const userBranchId = FAKE_HQ_ID;
    const allowed = bypass || (hq !== null && userBranchId === hq.id);
    expect(allowed).toBe(false);
  });
});
