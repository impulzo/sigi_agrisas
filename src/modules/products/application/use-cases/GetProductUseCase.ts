import { ProductRepository } from "../ports/ProductRepository";
import { ProductDto } from "../dto/ProductDto";
import { toProductDto } from "../mappers/toProductDto";
import { ProductNotFoundError } from "../../domain/errors/ProductNotFoundError";

export class GetProductUseCase {
  constructor(private readonly repo: ProductRepository) {}

  async execute(id: string): Promise<ProductDto> {
    const found = await this.repo.findById(id);
    if (!found) throw new ProductNotFoundError(id);
    return toProductDto(found);
  }
}
