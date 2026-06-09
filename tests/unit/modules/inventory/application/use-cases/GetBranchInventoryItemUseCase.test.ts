import { GetBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/GetBranchInventoryItemUseCase";
import { InMemoryBranchInventoryRepository } from "@/modules/inventory/infrastructure/repositories/InMemoryBranchInventoryRepository";
import { BranchInventoryRecordNotFoundError } from "@/modules/inventory/domain/errors/BranchInventoryRecordNotFoundError";

const BRANCH_ID = "11111111-1111-1111-1111-111111111111";
const PRODUCT_ID = "22222222-2222-2222-2222-222222222222";

describe("GetBranchInventoryItemUseCase", () => {
  let repo: InMemoryBranchInventoryRepository;
  let useCase: GetBranchInventoryItemUseCase;

  beforeEach(() => {
    repo = new InMemoryBranchInventoryRepository();
    repo.reset();
    useCase = new GetBranchInventoryItemUseCase(repo);
  });

  it("returns the inventory item for an existing (branch, product) pair", async () => {
    repo.setProductInfo(PRODUCT_ID, "ARROZ_001", "Arroz");
    await repo.create({ branchId: BRANCH_ID, productId: PRODUCT_ID, quantity: 50, reorderPoint: 10 });
    const result = await useCase.execute(BRANCH_ID, PRODUCT_ID);
    expect(result.branchId).toBe(BRANCH_ID);
    expect(result.productId).toBe(PRODUCT_ID);
    expect(result.quantity).toBe(50);
    expect(result.productCode).toBe("ARROZ_001");
    expect(result.productName).toBe("Arroz");
  });

  it("throws BranchInventoryRecordNotFoundError when no record exists for the pair", async () => {
    await expect(
      useCase.execute(BRANCH_ID, PRODUCT_ID)
    ).rejects.toThrow(BranchInventoryRecordNotFoundError);
  });
});
