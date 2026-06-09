import { prisma } from "@/shared/infrastructure/prisma/client";
import { PrismaDepartmentRepository } from "@/modules/departments/infrastructure/repositories/PrismaDepartmentRepository";
import { PrismaBranchRepository } from "@/modules/branches/infrastructure/repositories/PrismaBranchRepository";
import { PrismaProductRepository } from "@/modules/products/infrastructure/repositories/PrismaProductRepository";
import { CreateProductUseCase } from "@/modules/products/application/use-cases/CreateProductUseCase";
import { PrismaBranchInventoryRepository } from "@/modules/inventory/infrastructure/repositories/PrismaBranchInventoryRepository";
import { CreateBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/CreateBranchInventoryItemUseCase";
import { AdjustStockUseCase } from "@/modules/inventory/application/use-cases/AdjustStockUseCase";
import { ListBranchInventoryUseCase } from "@/modules/inventory/application/use-cases/ListBranchInventoryUseCase";
import { NegativeStockNotAllowedError } from "@/modules/inventory/domain/errors/NegativeStockNotAllowedError";

const DCODE = "INVTEST_IDEPT_1";
const PCODE = "INVTEST_IPROD_1";
const BCODE = "INVTEST_IBRANCH_1";

async function cleanup() {
  await prisma.product.deleteMany({ where: { code: { startsWith: "INVTEST_I" } } });
  await prisma.branch.deleteMany({ where: { code: { startsWith: "INVTEST_I" } } });
  await prisma.department.deleteMany({ where: { code: { startsWith: "INVTEST_I" } } });
}

afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

describe("Inventory CRUD — integration (real DB)", () => {
  const departmentRepo = new PrismaDepartmentRepository(prisma);
  const branchRepo = new PrismaBranchRepository(prisma);
  const productRepo = new PrismaProductRepository(prisma);
  const inventoryRepo = new PrismaBranchInventoryRepository(prisma);

  const createProduct = new CreateProductUseCase(productRepo, departmentRepo);
  const createInventory = new CreateBranchInventoryItemUseCase(inventoryRepo, branchRepo, productRepo);
  const adjustStock = new AdjustStockUseCase(inventoryRepo);
  const listInventory = new ListBranchInventoryUseCase(inventoryRepo, branchRepo);

  let branchId: string;
  let productId: string;

  beforeAll(async () => {
    await cleanup();
    const dept = await departmentRepo.create({ code: DCODE, name: "Dept Inventario" });
    const branch = await branchRepo.create({ code: BCODE, name: "Sucursal Inventario" });
    branchId = branch.id;
    const product = await createProduct.execute({ code: PCODE, name: "Producto Inventario", unit: "kg", departmentId: dept.id });
    productId = product.id;
  });

  it("creates an inventory record with initial stock", async () => {
    const record = await createInventory.execute(branchId, { productId, quantity: 50, reorderPoint: 20 });
    expect(record.quantity).toBe(50);
    expect(record.reorderPoint).toBe(20);
    expect(record.productCode).toBe(PCODE);
  });

  it("applies a positive adjustment", async () => {
    const result = await adjustStock.execute(branchId, productId, { delta: 10 });
    expect(result.quantity).toBe(60);
  });

  it("applies a negative adjustment within stock", async () => {
    const result = await adjustStock.execute(branchId, productId, { delta: -55 });
    expect(result.quantity).toBe(5);
  });

  it("rejects an adjustment that would make stock negative (and does not modify the row)", async () => {
    await expect(adjustStock.execute(branchId, productId, { delta: -100 })).rejects.toThrow(
      NegativeStockNotAllowedError
    );
    const after = await inventoryRepo.findByBranchAndProduct(branchId, productId);
    expect(after?.inventory.quantity).toBe(5);
  });

  it("lists records below the reorder point", async () => {
    const result = await listInventory.execute({ branchId, page: 1, pageSize: 100, belowReorder: true });
    const found = result.items.find((i) => i.productId === productId);
    expect(found).toBeDefined();
  });
});
