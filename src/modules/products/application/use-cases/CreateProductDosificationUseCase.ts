import { ProductRepository } from "../ports/ProductRepository";
import { ProductPriceRepository } from "../ports/ProductPriceRepository";
import { ProductDosificationRepository } from "../ports/ProductDosificationRepository";
import { CreateProductDosificationRequest } from "../dto/CreateProductDosificationRequest";
import { ProductDosificationDto } from "../dto/ProductDosificationDto";
import { toProductDosificationDto } from "../mappers/toProductDosificationDto";
import { ProductNotFoundError } from "../../domain/errors/ProductNotFoundError";

export class CreateProductDosificationUseCase {
  constructor(
    private readonly productRepo: ProductRepository,
    private readonly priceRepo: ProductPriceRepository,
    private readonly dosificationRepo: ProductDosificationRepository
  ) {}

  async execute(productId: string, req: CreateProductDosificationRequest): Promise<ProductDosificationDto> {
    const product = await this.productRepo.findById(productId);
    if (!product) throw new ProductNotFoundError(productId);

    const created = await this.dosificationRepo.create({
      productId,
      name: req.name,
      numParts: req.numParts,
      isActive: req.isActive ?? true,
    });

    const defaultPrice = await this.priceRepo.findDefaultByProductId(productId);
    return toProductDosificationDto(created, defaultPrice);
  }
}
