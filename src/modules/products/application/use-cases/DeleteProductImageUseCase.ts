import type { ProductRepository } from "../ports/ProductRepository";
import type { ProductImageStoragePort } from "../ports/ProductImageStoragePort";
import { ProductNotFoundError } from "../../domain/errors/ProductNotFoundError";

export class DeleteProductImageUseCase {
  constructor(
    private readonly repo: ProductRepository,
    private readonly storage: ProductImageStoragePort,
  ) {}

  async execute(productId: string): Promise<void> {
    const product = await this.repo.findById(productId);
    if (!product) throw new ProductNotFoundError(productId);

    if (product.product.imageUrl) {
      await this.storage.delete(product.product.imageUrl).catch(() => {});
      await this.repo.update(productId, { imageUrl: null });
    }
    // idempotent: if already null, nothing to do
  }
}
