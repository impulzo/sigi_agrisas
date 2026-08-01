import { RebuildInventoryArticleUseCase } from "@/modules/inventory/application/use-cases/RebuildInventoryArticleUseCase";
import { InMemoryInventoryMovementRepository } from "@/modules/inventory/infrastructure/repositories/InMemoryInventoryMovementRepository";
import { InventoryMovement } from "@/modules/inventory/domain/entities/InventoryMovement";

const BRANCH_ID = "branch-1";
const PRODUCT_ID = "product-1";

function seedMovement(
  repo: InMemoryInventoryMovementRepository,
  overrides: { sequence: number; direction: "IN" | "OUT"; quantity: number; balanceAfter: number }
) {
  repo.seed(
    InventoryMovement.create({
      id: `m-${overrides.sequence}`,
      branchId: BRANCH_ID,
      productId: PRODUCT_ID,
      movementAt: new Date(`2026-01-0${overrides.sequence}`),
      sequence: overrides.sequence,
      movementType: overrides.direction === "IN" ? "adjustment_in" : "adjustment_out",
      direction: overrides.direction,
      quantity: overrides.quantity,
      unit: "PZA",
      balanceAfter: overrides.balanceAfter,
      unitCost: null,
      unitPrice: null,
      customerId: null,
      providerId: null,
      folioId: null,
      folioCode: null,
      folioNumber: null,
      originFolioCode: null,
      originFolioNumber: null,
      sourceType: "adjustment",
      sourceId: "adj-1",
      status: "Aplicada",
      notes: null,
      createdBy: null,
      createdAt: new Date(),
    })
  );
}

describe("RebuildInventoryArticleUseCase", () => {
  it("recomputes balanceAfter from movements and returns the drift", async () => {
    const repo = new InMemoryInventoryMovementRepository();
    // Simulate drift: stored balances say 100 but real cumulative total is 70.
    seedMovement(repo, { sequence: 1, direction: "IN", quantity: 50, balanceAfter: 999 });
    seedMovement(repo, { sequence: 2, direction: "OUT", quantity: 20, balanceAfter: 999 });
    seedMovement(repo, { sequence: 3, direction: "IN", quantity: 40, balanceAfter: 999 });
    repo.setCurrentQuantity(BRANCH_ID, PRODUCT_ID, 100);

    const useCase = new RebuildInventoryArticleUseCase(repo);
    const result = await useCase.execute(PRODUCT_ID, BRANCH_ID);

    expect(result.movementsRebuilt).toBe(3);
    expect(result.previousQuantity).toBe(100);
    expect(result.newQuantity).toBe(70);
  });

  it("returns movementsRebuilt=0 and newQuantity=0 when there are no movements", async () => {
    const repo = new InMemoryInventoryMovementRepository();
    const useCase = new RebuildInventoryArticleUseCase(repo);

    const result = await useCase.execute(PRODUCT_ID, BRANCH_ID);

    expect(result.movementsRebuilt).toBe(0);
    expect(result.newQuantity).toBe(0);
  });
});
