import { ProductRepository } from "../ports/ProductRepository";
import { ProductPriceRepository } from "../ports/ProductPriceRepository";
import { ListProductPricesResponse } from "../dto/ListProductPricesResponse";
import { toProductPriceDto } from "../mappers/toProductPriceDto";
import { ProductNotFoundError } from "../../domain/errors/ProductNotFoundError";
import { ProductPriceBranchNotFoundError } from "../../domain/errors/ProductPriceBranchNotFoundError";
import { BranchActiveLookup } from "./CreateProductPriceUseCase";

export class ListProductPricesUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly priceRepo: ProductPriceRepository,
    private readonly branchRepo?: BranchActiveLookup
  ) {}

  async execute(productId: string, branchId?: string): Promise<ListProductPricesResponse> {
    const [exists, branch] = await Promise.all([
      this.productRepo.exists(productId),
      branchId && this.branchRepo ? this.branchRepo.findById(branchId) : Promise.resolve(null),
    ]);
    if (!exists) throw new ProductNotFoundError(productId);

    if (branchId) {
      if (!branch) throw new ProductPriceBranchNotFoundError(branchId);
      const prices = await this.priceRepo.findEffectiveForBranch(productId, branchId);
      return { items: prices.map(toProductPriceDto) };
    }

    const prices = await this.priceRepo.findByProductId(productId);
    return { items: prices.map(toProductPriceDto) };
  }
}
