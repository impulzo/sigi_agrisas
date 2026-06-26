import { ProductWithDepartment } from "../ports/ProductRepository";
import { ProductDto } from "../dto/ProductDto";

export function toProductDto({ product, departmentName, taxRateCode, providerName, providerId }: ProductWithDepartment): ProductDto {
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    unit: product.unit,
    satProductCode: product.satProductCode,
    departmentId: product.departmentId,
    departmentName,
    taxRateId: product.taxRateId,
    taxRateCode: taxRateCode ?? null,
    providerId: providerId ?? null,
    providerName: providerName ?? null,
    ivaRate: product.ivaRate,
    iepsRate: product.iepsRate,
    imageUrl: product.imageUrl,
    isTaxable: product.isTaxable,
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
