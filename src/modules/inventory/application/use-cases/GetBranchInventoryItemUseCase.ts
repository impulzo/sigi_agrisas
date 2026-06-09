import { BranchInventoryRepository } from "../ports/BranchInventoryRepository";
import { BranchInventoryDto } from "../dto/BranchInventoryDto";
import { toBranchInventoryDto } from "../mappers/toBranchInventoryDto";
import { BranchInventoryRecordNotFoundError } from "../../domain/errors/BranchInventoryRecordNotFoundError";

export class GetBranchInventoryItemUseCase {
  constructor(private readonly repo: BranchInventoryRepository) {}

  async execute(branchId: string, productId: string): Promise<BranchInventoryDto> {
    const view = await this.repo.findByBranchAndProduct(branchId, productId);
    if (!view) throw new BranchInventoryRecordNotFoundError();
    return toBranchInventoryDto(view);
  }
}
