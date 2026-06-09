import { UpdateBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/UpdateBranchInventoryItemUseCase";
import { InMemoryBranchInventoryRepository } from "@/modules/inventory/infrastructure/repositories/InMemoryBranchInventoryRepository";
import { BranchInventoryRecordNotFoundError } from "@/modules/inventory/domain/errors/BranchInventoryRecordNotFoundError";

const BRANCH_ID = "11111111-1111-1111-1111-111111111111";
const PRODUCT_ID = "22222222-2222-2222-2222-222222222222";

describe("UpdateBranchInventoryItemUseCase", () => {
  let repo: InMemoryBranchInventoryRepository;
  let useCase: UpdateBranchInventoryItemUseCase;

  beforeEach(async () => {
    repo = new InMemoryBranchInventoryRepository();
    repo.reset();
    useCase = new UpdateBranchInventoryItemUseCase(repo);
    await repo.create({ branchId: BRANCH_ID, productId: PRODUCT_ID, quantity: 10, reorderPoint: 5 });
  });

  it("sets quantity absolutely (not as a delta)", async () => {
    const result = await useCase.execute(BRANCH_ID, PRODUCT_ID, { quantity: 100 });
    expect(result.quantity).toBe(100);
  });

  it("updates reorderPoint without touching quantity", async () => {
    const result = await useCase.execute(BRANCH_ID, PRODUCT_ID, { reorderPoint: 20 });
    expect(result.reorderPoint).toBe(20);
    expect(result.quantity).toBe(10);
  });

  it("throws BranchInventoryRecordNotFoundError when no record exists", async () => {
    await expect(
      useCase.execute("99999999-9999-9999-9999-999999999999", PRODUCT_ID, { quantity: 1 })
    ).rejects.toThrow(BranchInventoryRecordNotFoundError);
  });
});
