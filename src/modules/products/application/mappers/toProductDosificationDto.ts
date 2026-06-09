import { ProductDosification } from "../../domain/entities/ProductDosification";
import { ProductPrice } from "../../domain/entities/ProductPrice";
import { DosificationPriceCalculator } from "../../domain/services/DosificationPriceCalculator";
import { ProductDosificationDto } from "../dto/ProductDosificationDto";

export function toProductDosificationDto(
  dosification: ProductDosification,
  defaultPrice?: ProductPrice | null
): ProductDosificationDto {
  const hasDefault = defaultPrice != null;
  return {
    id: dosification.id,
    productId: dosification.productId,
    name: dosification.name,
    numParts: dosification.numParts,
    isActive: dosification.isActive,
    computedUnitPrice: hasDefault
      ? DosificationPriceCalculator.computeUnitPrice(defaultPrice!.price, dosification.numParts)
      : null,
    requiresDefaultPrice: !hasDefault,
    createdAt: dosification.createdAt.toISOString(),
    updatedAt: dosification.updatedAt.toISOString(),
  };
}
