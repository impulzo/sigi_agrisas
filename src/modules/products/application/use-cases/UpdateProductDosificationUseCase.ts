import { ProductPriceRepository } from "../ports/ProductPriceRepository";
import { ProductDosificationRepository } from "../ports/ProductDosificationRepository";
import { UpdateProductDosificationRequest } from "../dto/UpdateProductDosificationRequest";
import { ProductDosificationDto } from "../dto/ProductDosificationDto";
import { toProductDosificationDto } from "../mappers/toProductDosificationDto";
import { ProductDosificationNotFoundError } from "../../domain/errors/ProductDosificationNotFoundError";

export class UpdateProductDosificationUseCase {
  constructor(
    private readonly priceRepo: ProductPriceRepository,
    private readonly dosificationRepo: ProductDosificationRepository
  ) {}

  async execute(
    productId: string,
    dosificationId: string,
    req: UpdateProductDosificationRequest
  ): Promise<ProductDosificationDto> {
    const existing = await this.dosificationRepo.findById(dosificationId);
    if (!existing || existing.productId !== productId) {
      throw new ProductDosificationNotFoundError(dosificationId);
    }

    const updated = await this.dosificationRepo.update(dosificationId, req);
    const defaultPrice = await this.priceRepo.findDefaultByProductId(productId);
    return toProductDosificationDto(updated, defaultPrice);
  }
}
