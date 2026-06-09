import { BranchRepository } from "@/modules/branches/application/ports/BranchRepository";
import { ProductRepository } from "@/modules/products/application/ports/ProductRepository";
import { BranchInventoryRepository } from "../ports/BranchInventoryRepository";
import { CreateBranchInventoryRequest } from "../dto/CreateBranchInventoryRequest";
import { BranchInventoryDto } from "../dto/BranchInventoryDto";
import { toBranchInventoryDto } from "../mappers/toBranchInventoryDto";
import { InventoryBranchNotFoundError } from "../../domain/errors/InventoryBranchNotFoundError";
import { InventoryProductNotAvailableError } from "../../domain/errors/InventoryProductNotAvailableError";

export class CreateBranchInventoryItemUseCase {
  constructor(
    private readonly repo: BranchInventoryRepository,
    private readonly branchRepo: BranchRepository,
    private readonly productRepo: ProductRepository
  ) {}

  async execute(branchId: string, req: CreateBranchInventoryRequest): Promise<BranchInventoryDto> {
    const branch = await this.branchRepo.findById(branchId);
    if (!branch || !branch.isActive) throw new InventoryBranchNotFoundError(branchId);

    const product = await this.productRepo.findById(req.productId);
    if (!product || !product.product.isActive) {
      throw new InventoryProductNotAvailableError(req.productId);
    }

    const view = await this.repo.create({
      branchId,
      productId: req.productId,
      quantity: req.quantity,
      reservedQuantity: req.reservedQuantity,
      reorderPoint: req.reorderPoint,
    });
    return toBranchInventoryDto(view);
  }
}
