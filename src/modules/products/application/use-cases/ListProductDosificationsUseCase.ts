import { ProductRepository } from "../ports/ProductRepository";
import { ProductPriceRepository } from "../ports/ProductPriceRepository";
import { ProductDosificationRepository } from "../ports/ProductDosificationRepository";
import { ListProductDosificationsResponse } from "../dto/ListProductDosificationsResponse";
import { toProductDosificationDto } from "../mappers/toProductDosificationDto";
import { ProductNotFoundError } from "../../domain/errors/ProductNotFoundError";

export class ListProductDosificationsUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly priceRepo: ProductPriceRepository,
    private readonly dosificationRepo: ProductDosificationRepository
  ) {}

  async execute(productId: string): Promise<ListProductDosificationsResponse> {
    const product = await this.productRepo.findById(productId);
    if (!product) throw new ProductNotFoundError(productId);

    const [dosifications, defaultPrice] = await Promise.all([
      this.dosificationRepo.findByProductId(productId),
      this.priceRepo.findDefaultByProductId(productId),
    ]);

    return {
      items: dosifications.map((d) => toProductDosificationDto(d, defaultPrice)),
    };
  }
}
