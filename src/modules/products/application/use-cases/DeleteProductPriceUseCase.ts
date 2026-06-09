import { ProductPriceRepository } from "../ports/ProductPriceRepository";
import { ProductPriceNotFoundError } from "../../domain/errors/ProductPriceNotFoundError";

export class DeleteProductPriceUseCase {
  constructor(private readonly priceRepo: ProductPriceRepository) {}

  async execute(productId: string, priceId: string): Promise<void> {
    const existing = await this.priceRepo.findById(priceId);
    if (!existing || existing.productId !== productId) {
      throw new ProductPriceNotFoundError(priceId);
    }
    await this.priceRepo.delete(priceId);
  }
}
