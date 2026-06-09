import { ProductPriceRepository } from "../ports/ProductPriceRepository";
import { UpdateProductPriceRequest } from "../dto/UpdateProductPriceRequest";
import { ProductPriceDto } from "../dto/ProductPriceDto";
import { toProductPriceDto } from "../mappers/toProductPriceDto";
import { ProductPriceNotFoundError } from "../../domain/errors/ProductPriceNotFoundError";

export class UpdateProductPriceUseCase {
  constructor(private readonly priceRepo: ProductPriceRepository) {}

  async execute(
    productId: string,
    priceId: string,
    req: UpdateProductPriceRequest
  ): Promise<ProductPriceDto> {
    const existing = await this.priceRepo.findById(priceId);
    if (!existing || existing.productId !== productId) {
      throw new ProductPriceNotFoundError(priceId);
    }

    if (req.isDefault === true && !existing.isDefault) {
      // Atomic: unset old default and set this one in a single DB transaction.
      const updated = await this.priceRepo.unsetDefaultAndUpdate(productId, priceId, req);
      return toProductPriceDto(updated);
    }

    const updated = await this.priceRepo.update(priceId, req);
    return toProductPriceDto(updated);
  }
}
