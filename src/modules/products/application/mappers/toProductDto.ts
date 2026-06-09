import { ProductWithDepartment } from "../ports/ProductRepository";
import { ProductDto } from "../dto/ProductDto";

export function toProductDto({ product, departmentName }: ProductWithDepartment): ProductDto {
  return {
    id: product.id,
    code: product.code,
    name: product.name,
    unit: product.unit,
    satProductCode: product.satProductCode,
    departmentId: product.departmentId,
    departmentName,
    ivaRate: product.ivaRate,
    iepsRate: product.iepsRate,
    isActive: product.isActive,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  };
}
