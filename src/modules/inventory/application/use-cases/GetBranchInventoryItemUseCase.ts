import { BranchInventoryRepository } from "../ports/BranchInventoryRepository";
import { InventoryLotRepository } from "../ports/InventoryLotRepository";
import { BranchInventoryDto } from "../dto/BranchInventoryDto";
import { toBranchInventoryDto } from "../mappers/toBranchInventoryDto";
import { BranchInventoryRecordNotFoundError } from "../../domain/errors/BranchInventoryRecordNotFoundError";
import { ExpiryStatusCalculator } from "../../domain/services/ExpiryStatusCalculator";

export class GetBranchInventoryItemUseCase {
  constructor(
    private readonly repo: BranchInventoryRepository,
    private readonly lotRepo: InventoryLotRepository
  ) {}

  async execute(branchId: string, productId: string): Promise<BranchInventoryDto> {
    const view = await this.repo.findByBranchAndProduct(branchId, productId);
    if (!view) throw new BranchInventoryRecordNotFoundError();
    const dto = toBranchInventoryDto(view);

    const nearestExpirations = await this.lotRepo.findNearestExpirationByProducts(branchId, [productId]);
    const nearest = nearestExpirations.get(productId);
    if (nearest) {
      dto.nearestExpirationDate = nearest.expirationDate.toISOString();
      dto.nearestExpirationLotNumber = nearest.lotNumber;
      dto.expiryStatus = ExpiryStatusCalculator.compute(nearest.expirationDate, new Date());
    }

    return dto;
  }
}
