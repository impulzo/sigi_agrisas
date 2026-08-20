import { ProductWithDepartment } from "../ports/ProductRepository";
import { ProductDto } from "../dto/ProductDto";

export function toProductDto({ product, departmentName, taxRateCode, taxRate, providerName, providerId, stock, unitDescription }: ProductWithDepartment): ProductDto {
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    unit: product.unit,
    unitDescription,
    satProductCode: product.satProductCode,
    departmentId: product.departmentId,
    departmentName,
    taxRateId: product.taxRateId,
    taxRateCode: taxRateCode ?? null,
    taxRate: taxRate ?? null,
    providerId: providerId ?? null,
    providerName: providerName ?? null,
    ivaRate: product.ivaRate,
    iepsRate: product.iepsRate,
    imageUrl: product.imageUrl,
    manufactureDate: product.manufactureDate ? product.manufactureDate.toISOString().slice(0, 10) : null,
    acquisitionPrice: product.acquisitionPrice,
    isTaxable: product.isTaxable,
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
    stock,
  };
}
