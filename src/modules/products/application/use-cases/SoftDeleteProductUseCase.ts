import { ProductRepository } from "../ports/ProductRepository";

export class SoftDeleteProductUseCase {
  constructor(private readonly repo: ProductRepository) {}

  async execute(id: string): Promise<void> {
    await this.repo.softDelete(id);
  }
}
