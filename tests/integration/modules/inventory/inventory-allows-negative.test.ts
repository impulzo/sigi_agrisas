/**
 * Integration test: verificar que el CHECK quantity >= 0 fue eliminado
 * de branch_inventory y que el admin /adjust sigue rechazando negativos.
 */
import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaBranchRepository } from "@/modules/branches/infrastructure/repositories/PrismaBranchRepository";
import { PrismaDepartmentRepository } from "@/modules/departments/infrastructure/repositories/PrismaDepartmentRepository";
import { PrismaProductRepository } from "@/modules/products/infrastructure/repositories/PrismaProductRepository";
import { PrismaBranchInventoryRepository } from "@/modules/inventory/infrastructure/repositories/PrismaBranchInventoryRepository";
import { CreateProductUseCase } from "@/modules/products/application/use-cases/CreateProductUseCase";
import { CreateBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/CreateBranchInventoryItemUseCase";
import { AdjustStockUseCase } from "@/modules/inventory/application/use-cases/AdjustStockUseCase";
import { NegativeStockNotAllowedError } from "@/modules/inventory/domain/errors/NegativeStockNotAllowedError";

const P = "INVNEG_";

async function cleanup() {
  await prisma.branchInventory.deleteMany({ where: { branch: { code: { startsWith: P } } } });
  await prisma.product.deleteMany({ where: { code: { startsWith: P } } });
  await prisma.branch.deleteMany({ where: { code: { startsWith: P } } });
  await prisma.department.deleteMany({ where: { code: { startsWith: P } } });
}

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("Inventory — stock negativo permitido en BD (integration real DB)", () => {
  const branchRepo = new PrismaBranchRepository(prisma);
  const deptRepo = new PrismaDepartmentRepository(prisma);
  const productRepo = new PrismaProductRepository(prisma);
  const inventoryRepo = new PrismaBranchInventoryRepository(prisma);

  const createProduct = new CreateProductUseCase(productRepo, deptRepo);
  const createInventory = new CreateBranchInventoryItemUseCase(inventoryRepo, branchRepo, productRepo);
  const adjustStock = new AdjustStockUseCase(inventoryRepo);

  let branchId: string;
  let productId: string;

  beforeAll(async () => {
    await cleanup();

    const branch = await branchRepo.create({ code: `${P}BRANCH1`, name: "Sucursal Neg Inv" });
    branchId = branch.id;

    const dept = await deptRepo.create({ code: `${P}DEPT1`, name: "Dept Neg Inv" });
    const product = await createProduct.execute({
      code: `${P}PROD1`, name: "Producto Neg Inv", unit: "u", departmentId: dept.id,
    });
    productId = product.id;

    await createInventory.execute(branchId, { productId, quantity: 10, reorderPoint: 0 });
  });

  it("$executeRaw puede insertar/actualizar quantity negativa directamente (CHECK eliminado)", async () => {
    const rows = await prisma.$executeRaw`
      UPDATE branch_inventory
      SET quantity = -5
      WHERE branch_id = ${branchId} AND product_id = ${productId}
    `;
    expect(rows).toBe(1);

    const inv = await prisma.branchInventory.findFirst({ where: { branchId, productId } });
    expect(Number(inv!.quantity)).toBe(-5);
  });

  it("reserved_quantity CHECK sigue vigente — UPDATE a negativo devuelve error", async () => {
    await expect(
      prisma.$executeRaw`
        UPDATE branch_inventory
        SET reserved_quantity = -1
        WHERE branch_id = ${branchId} AND product_id = ${productId}
      `
    ).rejects.toThrow();
  });

  it("reorder_point CHECK sigue vigente", async () => {
    await expect(
      prisma.$executeRaw`
        UPDATE branch_inventory
        SET reorder_point = -1
        WHERE branch_id = ${branchId} AND product_id = ${productId}
      `
    ).rejects.toThrow();
  });

  it("restablecer stock a positivo para probar /adjust", async () => {
    await prisma.$executeRaw`
      UPDATE branch_inventory SET quantity = 10 WHERE branch_id = ${branchId} AND product_id = ${productId}
    `;
    const inv = await prisma.branchInventory.findFirst({ where: { branchId, productId } });
    expect(Number(inv!.quantity)).toBe(10);
  });

  it("admin /adjust acepta delta positivo normalmente", async () => {
    const result = await adjustStock.execute(branchId, productId, { delta: 5 });
    expect(result.quantity).toBe(15);
  });

  it("admin /adjust rechaza delta que dejaría stock negativo → NegativeStockNotAllowedError", async () => {
    await expect(adjustStock.execute(branchId, productId, { delta: -100 })).rejects.toThrow(
      NegativeStockNotAllowedError
    );
    const inv = await prisma.branchInventory.findFirst({ where: { branchId, productId } });
    expect(Number(inv!.quantity)).toBe(15);
  });
});
