import { ProductDosificationRepository } from "../ports/ProductDosificationRepository";
import { ProductDosificationNotFoundError } from "../../domain/errors/ProductDosificationNotFoundError";

export class SoftDeleteProductDosificationUseCase {
  constructor(private readonly dosificationRepo: ProductDosificationRepository) {}

  async execute(productId: string, dosificationId: string): Promise<void> {
    const existing = await this.dosificationRepo.findById(dosificationId);
    if (!existing || existing.productId !== productId) {
      throw new ProductDosificationNotFoundError(dosificationId);
    }
    await this.dosificationRepo.softDelete(dosificationId);
  }
}
