import { BranchInventoryRepository } from "../ports/BranchInventoryRepository";
import { BranchInventoryRecordNotFoundError } from "../../domain/errors/BranchInventoryRecordNotFoundError";

export class DeleteBranchInventoryItemUseCase {
  constructor(private readonly repo: BranchInventoryRepository) {}

  async execute(branchId: string, productId: string): Promise<void> {
    const existing = await this.repo.findByBranchAndProduct(branchId, productId);
    if (!existing) throw new BranchInventoryRecordNotFoundError();
    await this.repo.delete(existing.inventory.id);
  }
}
