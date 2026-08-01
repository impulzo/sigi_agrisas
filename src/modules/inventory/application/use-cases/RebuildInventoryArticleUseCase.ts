import { InventoryMovementRepository } from "../ports/InventoryMovementRepository";
import { RebuildInventoryArticleResponseDto } from "../dto/RebuildInventoryArticleResponseDto";

export class RebuildInventoryArticleUseCase {
  constructor(private readonly repo: InventoryMovementRepository) {}

  async execute(productId: string, branchId: string): Promise<RebuildInventoryArticleResponseDto> {
    return this.repo.rebuild(productId, branchId);
  }
}
