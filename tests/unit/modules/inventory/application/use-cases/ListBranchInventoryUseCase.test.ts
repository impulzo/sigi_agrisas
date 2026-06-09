import { ListBranchInventoryUseCase } from "@/modules/inventory/application/use-cases/ListBranchInventoryUseCase";
import { InMemoryBranchInventoryRepository } from "@/modules/inventory/infrastructure/repositories/InMemoryBranchInventoryRepository";
import { InMemoryBranchRepository } from "@/modules/branches/infrastructure/repositories/InMemoryBranchRepository";
import { InventoryBranchNotFoundError } from "@/modules/inventory/domain/errors/InventoryBranchNotFoundError";

describe("ListBranchInventoryUseCase", () => {
  let repo: InMemoryBranchInventoryRepository;
  let branchRepo: InMemoryBranchRepository;
  let useCase: ListBranchInventoryUseCase;
  let branchId: string;

  beforeEach(async () => {
    repo = new InMemoryBranchInventoryRepository();
    repo.reset();
    branchRepo = new InMemoryBranchRepository();
    useCase = new ListBranchInventoryUseCase(repo, branchRepo);
    const branch = await branchRepo.create({ code: "SUC1", name: "Sucursal Centro" });
    branchId = branch.id;

    repo.setProductInfo("prod-arroz", "ARROZ_001", "Arroz");
    repo.setProductInfo("prod-frijol", "FRIJOL_001", "Frijol");
    await repo.create({ branchId, productId: "prod-arroz", quantity: 5, reorderPoint: 10 });
    await repo.create({ branchId, productId: "prod-frijol", quantity: 100, reorderPoint: 10 });
  });

  it("lists inventory for the branch", async () => {
    const result = await useCase.execute({ branchId, page: 1, pageSize: 20, belowReorder: false });
    expect(result.total).toBe(2);
  });

  it("filters records below the reorder point", async () => {
    const result = await useCase.execute({ branchId, page: 1, pageSize: 20, belowReorder: true });
    expect(result.total).toBe(1);
    expect(result.items[0].productCode).toBe("ARROZ_001");
  });

  it("searches by product code or name", async () => {
    const result = await useCase.execute({ branchId, page: 1, pageSize: 20, belowReorder: false, search: "frijol" });
    expect(result.total).toBe(1);
    expect(result.items[0].productCode).toBe("FRIJOL_001");
  });

  it("paginates", async () => {
    const result = await useCase.execute({ branchId, page: 1, pageSize: 1, belowReorder: false });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(2);
  });

  it("throws InventoryBranchNotFoundError when the branch does not exist", async () => {
    await expect(
      useCase.execute({ branchId: "nope", page: 1, pageSize: 20, belowReorder: false })
    ).rejects.toThrow(InventoryBranchNotFoundError);
  });
});
