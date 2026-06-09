import { DeleteBranchInventoryItemUseCase } from "@/modules/inventory/application/use-cases/DeleteBranchInventoryItemUseCase";
import { InMemoryBranchInventoryRepository } from "@/modules/inventory/infrastructure/repositories/InMemoryBranchInventoryRepository";
import { BranchInventoryRecordNotFoundError } from "@/modules/inventory/domain/errors/BranchInventoryRecordNotFoundError";

const BRANCH_ID = "11111111-1111-1111-1111-111111111111";
const PRODUCT_ID = "22222222-2222-2222-2222-222222222222";

describe("DeleteBranchInventoryItemUseCase", () => {
  let repo: InMemoryBranchInventoryRepository;
  let useCase: DeleteBranchInventoryItemUseCase;

  beforeEach(async () => {
    repo = new InMemoryBranchInventoryRepository();
    repo.reset();
    useCase = new DeleteBranchInventoryItemUseCase(repo);
    await repo.create({ branchId: BRANCH_ID, productId: PRODUCT_ID, quantity: 10 });
  });

  it("hard-deletes an existing record", async () => {
    await useCase.execute(BRANCH_ID, PRODUCT_ID);
    expect(await repo.findByBranchAndProduct(BRANCH_ID, PRODUCT_ID)).toBeNull();
  });

  it("throws BranchInventoryRecordNotFoundError when no record exists", async () => {
    await expect(useCase.execute(BRANCH_ID, PRODUCT_ID)).resolves.toBeUndefined();
    await expect(useCase.execute(BRANCH_ID, PRODUCT_ID)).rejects.toThrow(BranchInventoryRecordNotFoundError);
  });
});
