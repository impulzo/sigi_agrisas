import { ListBranchInventoryUseCase } from "@/modules/inventory/application/use-cases/ListBranchInventoryUseCase";
import { InMemoryBranchInventoryRepository } from "@/modules/inventory/infrastructure/repositories/InMemoryBranchInventoryRepository";
import { InMemoryInventoryLotRepository } from "@/modules/inventory/infrastructure/repositories/InMemoryInventoryLotRepository";
import { InMemoryBranchRepository } from "@/modules/branches/infrastructure/repositories/InMemoryBranchRepository";
import { InventoryBranchNotFoundError } from "@/modules/inventory/domain/errors/InventoryBranchNotFoundError";

describe("ListBranchInventoryUseCase", () => {
  let repo: InMemoryBranchInventoryRepository;
  let branchRepo: InMemoryBranchRepository;
  let lotRepo: InMemoryInventoryLotRepository;
  let useCase: ListBranchInventoryUseCase;
  let branchId: string;

  beforeEach(async () => {
    repo = new InMemoryBranchInventoryRepository();
    repo.reset();
    branchRepo = new InMemoryBranchRepository();
    lotRepo = new InMemoryInventoryLotRepository();
    useCase = new ListBranchInventoryUseCase(repo, branchRepo, lotRepo);
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

  it("returns null expiryStatus for products without registered lots", async () => {
    const result = await useCase.execute({ branchId, page: 1, pageSize: 20, belowReorder: false });
    const arroz = result.items.find((i) => i.productCode === "ARROZ_001")!;
    expect(arroz.expiryStatus).toBeNull();
    expect(arroz.nearestExpirationDate).toBeNull();
  });

  it("computes expiryStatus from the registered lot", async () => {
    const soon = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
    lotRepo.seedLot({ branchId, productId: "prod-arroz", lotNumber: "L1", expirationDate: soon });

    const result = await useCase.execute({ branchId, page: 1, pageSize: 20, belowReorder: false });
    const arroz = result.items.find((i) => i.productCode === "ARROZ_001")!;
    expect(arroz.expiryStatus).toBe("critical");
    expect(arroz.nearestExpirationLotNumber).toBe("L1");
  });

  it("uses the nearest lot when a product has multiple lots", async () => {
    const far = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);
    const near = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
    lotRepo.seedLot({ branchId, productId: "prod-arroz", lotNumber: "L-FAR", expirationDate: far });
    lotRepo.seedLot({ branchId, productId: "prod-arroz", lotNumber: "L-NEAR", expirationDate: near });

    const result = await useCase.execute({ branchId, page: 1, pageSize: 20, belowReorder: false });
    const arroz = result.items.find((i) => i.productCode === "ARROZ_001")!;
    expect(arroz.nearestExpirationLotNumber).toBe("L-NEAR");
    expect(arroz.expiryStatus).toBe("warning");
  });
});
