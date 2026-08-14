import { BranchRepository } from "@/modules/branches/application/ports/BranchRepository";
import { BranchInventoryRepository } from "../ports/BranchInventoryRepository";
import { InventoryLotRepository } from "../ports/InventoryLotRepository";
import { ListBranchInventoryRequest } from "../dto/ListBranchInventoryRequest";
import { ListBranchInventoryResponse } from "../dto/ListBranchInventoryResponse";
import { toBranchInventoryDto } from "../mappers/toBranchInventoryDto";
import { InventoryBranchNotFoundError } from "../../domain/errors/InventoryBranchNotFoundError";
import { ExpiryStatusCalculator } from "../../domain/services/ExpiryStatusCalculator";

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export class ListBranchInventoryUseCase {
  constructor(
    private readonly repo: BranchInventoryRepository,
    private readonly branchRepo: BranchRepository,
    private readonly lotRepo: InventoryLotRepository
  ) {}

  async execute(req: ListBranchInventoryRequest): Promise<ListBranchInventoryResponse> {
    const branch = await this.branchRepo.findById(req.branchId);
    if (!branch) throw new InventoryBranchNotFoundError(req.branchId);

    const page = Math.max(1, req.page);
    const pageSize = Math.min(req.pageSize ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

    const { items, total } = await this.repo.findAll({
      branchId: req.branchId,
      page,
      pageSize,
      search: req.search,
      belowReorder: req.belowReorder,
    });

    const dtos = items.map(toBranchInventoryDto);
    const nearestExpirations = await this.lotRepo.findNearestExpirationByProducts(
      req.branchId,
      dtos.map((dto) => dto.productId)
    );
    const now = new Date();
    for (const dto of dtos) {
      const nearest = nearestExpirations.get(dto.productId);
      if (nearest) {
        dto.nearestExpirationDate = nearest.expirationDate.toISOString();
        dto.nearestExpirationLotNumber = nearest.lotNumber;
        dto.expiryStatus = ExpiryStatusCalculator.compute(nearest.expirationDate, now);
      }
    }

    return { items: dtos, total, page, pageSize };
  }
}
