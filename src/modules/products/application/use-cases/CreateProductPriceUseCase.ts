import { ProductRepository } from "../ports/ProductRepository";
import { ProductPriceRepository } from "../ports/ProductPriceRepository";
import { CreateProductPriceRequest } from "../dto/CreateProductPriceRequest";
import { ProductPriceDto } from "../dto/ProductPriceDto";
import { toProductPriceDto } from "../mappers/toProductPriceDto";
import { ProductNotFoundError } from "../../domain/errors/ProductNotFoundError";
import { DuplicateDefaultPriceError } from "../../domain/errors/DuplicateDefaultPriceError";

export class CreateProductPriceUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly priceRepo: ProductPriceRepository
  ) {}

  async execute(productId: string, req: CreateProductPriceRequest): Promise<ProductPriceDto> {
    const product = await this.productRepo.findById(productId);
    if (!product) throw new ProductNotFoundError(productId);

    const isDefault = req.isDefault ?? false;
    if (isDefault) {
      const existingDefault = await this.priceRepo.findDefaultByProductId(productId);
      if (existingDefault) throw new DuplicateDefaultPriceError();
    }

    const created = await this.priceRepo.create({
      productId,
      name: req.name,
      price: req.price,
      minQuantity: req.minQuantity ?? 1,
      discountPct: req.discountPct ?? null,
      isDefault,
    });
    return toProductPriceDto(created);
  }
}
