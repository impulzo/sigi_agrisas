/**
 * Integration test: branch scoping para inventario.
 * Verifica que `enforceBranchScope` funciona correctamente para los
 * endpoints de inventario con el AuthorizationService real.
 */
import { NextRequest } from "next/server";
import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaBranchRepository } from "@/modules/branches/infrastructure/repositories/PrismaBranchRepository";
import { PrismaDepartmentRepository } from "@/modules/departments/infrastructure/repositories/PrismaDepartmentRepository";
import { PrismaProductRepository } from "@/modules/products/infrastructure/repositories/PrismaProductRepository";
import { PrismaBranchInventoryRepository } from "@/modules/inventory/infrastructure/repositories/PrismaBranchInventoryRepository";
import { PrismaAuthorizationService } from "@/modules/rbac/infrastructure/services/PrismaAuthorizationService";
import { UserRolePrismaRepository } from "@/modules/rbac/infrastructure/repositories/UserRolePrismaRepository";
import { CreateProductUseCase } from "@/modules/products/application/use-cases/CreateProductUseCase";
import { CreateBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/CreateBranchInventoryItemUseCase";
import { ListBranchInventoryUseCase } from "@/modules/inventory/application/use-cases/ListBranchInventoryUseCase";
import { enforceBranchScope } from "@/modules/rbac/infrastructure/http/enforceBranchScope";

const P = "INVSCOPE_";
const OPERATOR_USER_ID = "00000000-ff01-0000-0000-000000000001";

function makeRequest(headers: Record<string, string>) {
  return new NextRequest("http://localhost/inventory", { headers });
}

async function cleanup() {
  await prisma.userRole.deleteMany({ where: { userId: OPERATOR_USER_ID } });
  await prisma.user.deleteMany({ where: { email: { startsWith: P } } });
  await prisma.branchInventory.deleteMany({ where: { branch: { code: { startsWith: P } } } });
  await prisma.product.deleteMany({ where: { code: { startsWith: P } } });
  await prisma.branch.deleteMany({ where: { code: { startsWith: P } } });
  await prisma.department.deleteMany({ where: { code: { startsWith: P } } });
}

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("Inventory — branch scoping (integration real DB)", () => {
  const branchRepo = new PrismaBranchRepository(prisma);
  const deptRepo = new PrismaDepartmentRepository(prisma);
  const productRepo = new PrismaProductRepository(prisma);
  const inventoryRepo = new PrismaBranchInventoryRepository(prisma);
  const authzService = new PrismaAuthorizationService(prisma, new UserRolePrismaRepository(prisma));

  const createProduct = new CreateProductUseCase(productRepo, deptRepo);
  const createInventory = new CreateBranchInventoryItemUseCase(inventoryRepo, branchRepo, productRepo);
  const listInventory = new ListBranchInventoryUseCase(inventoryRepo, branchRepo);

  let branchAId: string;
  let branchBId: string;
  let productId: string;

  beforeAll(async () => {
    await cleanup();

    const branchA = await branchRepo.create({ code: `${P}BRA`, name: "Branch A Inv Scope" });
    branchAId = branchA.id;

    const branchB = await branchRepo.create({ code: `${P}BRB`, name: "Branch B Inv Scope" });
    branchBId = branchB.id;

    const dept = await deptRepo.create({ code: `${P}DEPT1`, name: "Dept Inv Scope" });
    const product = await createProduct.execute({
      code: `${P}PROD1`, name: "Producto Inv Scope", unit: "u", departmentId: dept.id,
    });
    productId = product.id;

    // Stock solo en branch A
    await createInventory.execute(branchAId, { productId, quantity: 20, reorderPoint: 5 });

    // Usuario operador asignado a branch A (sin branches:access_all)
    await prisma.user.create({
      data: { id: OPERATOR_USER_ID, email: `${P}op@test.com`, passwordHash: "hash", name: "Op Inv Scope" },
    });

    const viewerRole = await prisma.role.findFirstOrThrow({ where: { name: "viewer" } });
    await prisma.userRole.create({ data: { userId: OPERATOR_USER_ID, roleId: viewerRole.id } });
  });

  it("operador en branch A puede ver inventario de branch A", async () => {
    const req = makeRequest({ "x-user-id": OPERATOR_USER_ID, "x-user-branch-id": branchAId });
    const scopeResult = await enforceBranchScope(req, branchAId, authzService);
    expect(scopeResult).toBeNull(); // null = autorizado
  });

  it("operador en branch A NO puede ver inventario de branch B", async () => {
    const req = makeRequest({ "x-user-id": OPERATOR_USER_ID, "x-user-branch-id": branchAId });
    const scopeResult = await enforceBranchScope(req, branchBId, authzService);
    expect(scopeResult).not.toBeNull();
    expect(scopeResult!.status).toBe(403);
  });

  it("listInventory devuelve solo el inventario de branch A (aislamiento real)", async () => {
    const result = await listInventory.execute({ branchId: branchAId, page: 1, pageSize: 50, belowReorder: false });
    expect(result.items.length).toBeGreaterThan(0);
    result.items.forEach((item) => {
      expect(item.productId).toBe(productId);
    });
  });

  it("listInventory de branch B sin inventario devuelve vacío", async () => {
    const result = await listInventory.execute({ branchId: branchBId, page: 1, pageSize: 50, belowReorder: false });
    expect(result.items).toHaveLength(0);
  });

  it("usuario sin sucursal asignada (x-user-branch-id vacío) NO puede acceder", async () => {
    const req = makeRequest({ "x-user-id": OPERATOR_USER_ID, "x-user-branch-id": "" });
    const scopeResult = await enforceBranchScope(req, branchAId, authzService);
    expect(scopeResult).not.toBeNull();
    expect(scopeResult!.status).toBe(403);
  });
});
