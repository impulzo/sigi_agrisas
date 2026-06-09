import { BranchInventoryRepository } from "../ports/BranchInventoryRepository";
import { UpdateBranchInventoryRequest } from "../dto/UpdateBranchInventoryRequest";
import { BranchInventoryDto } from "../dto/BranchInventoryDto";
import { toBranchInventoryDto } from "../mappers/toBranchInventoryDto";
import { BranchInventoryRecordNotFoundError } from "../../domain/errors/BranchInventoryRecordNotFoundError";

export class UpdateBranchInventoryItemUseCase {
  constructor(private readonly repo: BranchInventoryRepository) {}

  async execute(
    branchId: string,
    productId: string,
    req: UpdateBranchInventoryRequest
  ): Promise<BranchInventoryDto> {
    const existing = await this.repo.findByBranchAndProduct(branchId, productId);
    if (!existing) throw new BranchInventoryRecordNotFoundError();

    const view = await this.repo.update(existing.inventory.id, req);
    return toBranchInventoryDto(view);
  }
}
