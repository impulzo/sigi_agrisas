import { AdjustStockUseCase } from "@/modules/inventory/application/use-cases/AdjustStockUseCase";
import { InMemoryBranchInventoryRepository } from "@/modules/inventory/infrastructure/repositories/InMemoryBranchInventoryRepository";
import { NegativeStockNotAllowedError } from "@/modules/inventory/domain/errors/NegativeStockNotAllowedError";
import { BranchInventoryRecordNotFoundError } from "@/modules/inventory/domain/errors/BranchInventoryRecordNotFoundError";

const BRANCH_ID = "11111111-1111-1111-1111-111111111111";
const PRODUCT_ID = "22222222-2222-2222-2222-222222222222";

describe("AdjustStockUseCase", () => {
  let repo: InMemoryBranchInventoryRepository;
  let useCase: AdjustStockUseCase;

  beforeEach(async () => {
    repo = new InMemoryBranchInventoryRepository();
    repo.reset();
    useCase = new AdjustStockUseCase(repo);
    await repo.create({ branchId: BRANCH_ID, productId: PRODUCT_ID, quantity: 50 });
  });

  it("applies a positive delta", async () => {
    const result = await useCase.execute(BRANCH_ID, PRODUCT_ID, { delta: 10 });
    expect(result.quantity).toBe(60);
  });

  it("applies a negative delta within stock", async () => {
    const result = await useCase.execute(BRANCH_ID, PRODUCT_ID, { delta: -10 });
    expect(result.quantity).toBe(40);
  });

  it("rejects a negative delta that would exceed stock", async () => {
    await expect(useCase.execute(BRANCH_ID, PRODUCT_ID, { delta: -100 })).rejects.toThrow(
      NegativeStockNotAllowedError
    );
  });

  it("throws BranchInventoryRecordNotFoundError when no record exists", async () => {
    await expect(
      useCase.execute("99999999-9999-9999-9999-999999999999", PRODUCT_ID, { delta: 5 })
    ).rejects.toThrow(BranchInventoryRecordNotFoundError);
  });

  it("persists the reason as the concept of the recorded movement", async () => {
    const result = await useCase.execute(BRANCH_ID, PRODUCT_ID, { delta: 5, reason: "Recepción factura 123" });
    expect(result.quantity).toBe(55);
    const adjustments = repo.getAdjustments(BRANCH_ID, PRODUCT_ID);
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0]).toMatchObject({ delta: 5, notes: "Recepción factura 123" });
  });

  it("records a null concept when no reason is provided", async () => {
    await useCase.execute(BRANCH_ID, PRODUCT_ID, { delta: 5 });
    const adjustments = repo.getAdjustments(BRANCH_ID, PRODUCT_ID);
    expect(adjustments[0]).toMatchObject({ delta: 5, notes: null });
  });
});
