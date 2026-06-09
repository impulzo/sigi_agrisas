import { ProductRepository } from "../ports/ProductRepository";
import { ProductPriceRepository } from "../ports/ProductPriceRepository";
import { ListProductPricesResponse } from "../dto/ListProductPricesResponse";
import { toProductPriceDto } from "../mappers/toProductPriceDto";
import { ProductNotFoundError } from "../../domain/errors/ProductNotFoundError";

export class ListProductPricesUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly priceRepo: ProductPriceRepository
  ) {}

  async execute(productId: string): Promise<ListProductPricesResponse> {
    const product = await this.productRepo.findById(productId);
    if (!product) throw new ProductNotFoundError(productId);
    const prices = await this.priceRepo.findByProductId(productId);
    return { items: prices.map(toProductPriceDto) };
  }
}
