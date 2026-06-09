/**
 * Integration test: branch scoping para ventas.
 * Verifica que `resolveScopedBranchId` y `enforceBranchScope` funcionan
 * correctamente con el AuthorizationService real contra Supabase.
 */
import { NextRequest } from "next/server";
import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaBranchRepository } from "@/modules/branches/infrastructure/repositories/PrismaBranchRepository";
import { PrismaAuthorizationService } from "@/modules/rbac/infrastructure/services/PrismaAuthorizationService";
import { UserRolePrismaRepository } from "@/modules/rbac/infrastructure/repositories/UserRolePrismaRepository";
import { enforceBranchScope, resolveScopedBranchId } from "@/modules/rbac/infrastructure/http/enforceBranchScope";

const P = "POSSCOPE_";
const BRANCH_A_ID = "00000000-aaaa-0000-0000-000000000001";
const BRANCH_B_ID = "00000000-bbbb-0000-0000-000000000002";
const USER_NO_BYPASS = "00000000-cccc-0000-0000-000000000003";

function makeRequest(headers: Record<string, string>) {
  return new NextRequest("http://localhost/sales", { headers });
}

async function cleanup() {
  await prisma.userRole.deleteMany({ where: { userId: USER_NO_BYPASS } });
  await prisma.user.deleteMany({ where: { email: { startsWith: P } } });
  await prisma.branch.deleteMany({ where: { code: { startsWith: P } } });
}

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("Branch scoping helpers — integration (real DB + real AuthorizationService)", () => {
  const branchRepo = new PrismaBranchRepository(prisma);
  const authzService = new PrismaAuthorizationService(prisma, new UserRolePrismaRepository(prisma));

  let branchAId: string;
  let branchBId: string;
  let userNoBypassId: string;

  beforeAll(async () => {
    await cleanup();

    const branchA = await branchRepo.create({ code: `${P}BRA`, name: "Branch A Scope" });
    branchAId = branchA.id;

    const branchB = await branchRepo.create({ code: `${P}BRB`, name: "Branch B Scope" });
    branchBId = branchB.id;

    // Usuario sin branches:access_all (rol viewer o sin rol)
    const user = await prisma.user.create({
      data: { id: USER_NO_BYPASS, email: `${P}user@test.com`, passwordHash: "hash", name: "Scope User" },
    });
    userNoBypassId = user.id;
  });

  describe("enforceBranchScope", () => {
    it("retorna null cuando el recurso está en la misma sucursal del usuario", async () => {
      const req = makeRequest({ "x-user-id": userNoBypassId, "x-user-branch-id": branchAId });
      const result = await enforceBranchScope(req, branchAId, authzService);
      expect(result).toBeNull();
    });

    it("retorna 403 cuando el recurso está en otra sucursal", async () => {
      const req = makeRequest({ "x-user-id": userNoBypassId, "x-user-branch-id": branchAId });
      const result = await enforceBranchScope(req, branchBId, authzService);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(403);
    });

    it("retorna 401 si falta x-user-id", async () => {
      const req = makeRequest({ "x-user-branch-id": branchAId });
      const result = await enforceBranchScope(req, branchAId, authzService);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(401);
    });

    it("retorna 403 cuando x-user-branch-id está vacío (sin sucursal asignada)", async () => {
      const req = makeRequest({ "x-user-id": userNoBypassId, "x-user-branch-id": "" });
      const result = await enforceBranchScope(req, branchAId, authzService);
      expect(result).not.toBeNull();
      expect(result!.status).toBe(403);
    });
  });

  describe("resolveScopedBranchId", () => {
    it("sin branchId en query → implica la sucursal del usuario", async () => {
      const req = makeRequest({ "x-user-id": userNoBypassId, "x-user-branch-id": branchAId });
      const result = await resolveScopedBranchId(req, undefined, authzService);
      expect(result).toEqual({ branchId: branchAId });
    });

    it("branchId en query igual al usuario → OK", async () => {
      const req = makeRequest({ "x-user-id": userNoBypassId, "x-user-branch-id": branchAId });
      const result = await resolveScopedBranchId(req, branchAId, authzService);
      expect(result).toEqual({ branchId: branchAId });
    });

    it("branchId en query diferente al usuario → 403", async () => {
      const req = makeRequest({ "x-user-id": userNoBypassId, "x-user-branch-id": branchAId });
      const result = await resolveScopedBranchId(req, branchBId, authzService);
      expect(result).toHaveProperty("status", 403);
    });

    it("usuario sin sucursal (x-user-branch-id vacío) sin branchId → 403", async () => {
      const req = makeRequest({ "x-user-id": userNoBypassId, "x-user-branch-id": "" });
      const result = await resolveScopedBranchId(req, undefined, authzService);
      expect(result).toHaveProperty("status", 403);
    });
  });
});
