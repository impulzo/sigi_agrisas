import { CreateBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/CreateBranchInventoryItemUseCase";
import { InMemoryBranchInventoryRepository } from "@/modules/inventory/infrastructure/repositories/InMemoryBranchInventoryRepository";
import { InMemoryBranchRepository } from "@/modules/branches/infrastructure/repositories/InMemoryBranchRepository";
import { InMemoryProductRepository } from "@/modules/products/infrastructure/repositories/InMemoryProductRepository";
import { BranchInventoryAlreadyExistsError } from "@/modules/inventory/domain/errors/BranchInventoryAlreadyExistsError";
import { InventoryProductNotAvailableError } from "@/modules/inventory/domain/errors/InventoryProductNotAvailableError";

const DEPT = "11111111-1111-1111-1111-111111111111";

describe("CreateBranchInventoryItemUseCase", () => {
  let repo: InMemoryBranchInventoryRepository;
  let branchRepo: InMemoryBranchRepository;
  let productRepo: InMemoryProductRepository;
  let useCase: CreateBranchInventoryItemUseCase;
  let branchId: string;
  let productId: string;

  beforeEach(async () => {
    repo = new InMemoryBranchInventoryRepository();
    repo.reset();
    branchRepo = new InMemoryBranchRepository();
    productRepo = new InMemoryProductRepository();
    productRepo.reset();
    useCase = new CreateBranchInventoryItemUseCase(repo, branchRepo, productRepo);
    const branch = await branchRepo.create({ code: "SUC1", name: "Sucursal" });
    branchId = branch.id;
    const product = await productRepo.create({ code: "P1", name: "Arroz", unit: "kg", departmentId: DEPT });
    productId = product.product.id;
  });

  it("creates an inventory record with initial stock", async () => {
    const result = await useCase.execute(branchId, { productId, quantity: 50, reorderPoint: 10 });
    expect(result.quantity).toBe(50);
    expect(result.reorderPoint).toBe(10);
    expect(result.reservedQuantity).toBe(0);
  });

  it("defaults stock fields to zero", async () => {
    const result = await useCase.execute(branchId, { productId });
    expect(result.quantity).toBe(0);
    expect(result.reservedQuantity).toBe(0);
    expect(result.reorderPoint).toBe(0);
  });

  it("throws BranchInventoryAlreadyExistsError on duplicate (branch, product)", async () => {
    await useCase.execute(branchId, { productId });
    await expect(useCase.execute(branchId, { productId })).rejects.toThrow(BranchInventoryAlreadyExistsError);
  });

  it("fails when the product is inactive", async () => {
    await productRepo.softDelete(productId);
    await expect(useCase.execute(branchId, { productId })).rejects.toThrow(InventoryProductNotAvailableError);
  });
});
