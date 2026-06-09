import { BranchInventoryRepository } from "../ports/BranchInventoryRepository";
import { AdjustStockRequest } from "../dto/AdjustStockRequest";
import { BranchInventoryDto } from "../dto/BranchInventoryDto";
import { toBranchInventoryDto } from "../mappers/toBranchInventoryDto";
import { BranchInventoryRecordNotFoundError } from "../../domain/errors/BranchInventoryRecordNotFoundError";

export class AdjustStockUseCase {
  constructor(private readonly repo: BranchInventoryRepository) {}

  async execute(branchId: string, productId: string, req: AdjustStockRequest): Promise<BranchInventoryDto> {
    const existing = await this.repo.findByBranchAndProduct(branchId, productId);
    if (!existing) throw new BranchInventoryRecordNotFoundError();

    // `adjust` is atomic and throws NegativeStockNotAllowedError when the result would be negative.
    const view = await this.repo.adjust(existing.inventory.id, req.delta);
    return toBranchInventoryDto(view);
  }
}
