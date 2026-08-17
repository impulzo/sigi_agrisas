import { DepartmentPriceListDepartmentDto } from "../../application/dto/DepartmentPriceListResponseDto";

/** Nombres únicos de lista de precio entre los departamentos dados, ordenados alfabéticamente (es-MX). */
export function priceColumnNames(departments: DepartmentPriceListDepartmentDto[]): string[] {
  const names = new Set<string>();
  for (const dept of departments) {
    for (const product of dept.products) {
      for (const price of product.prices) {
        names.add(price.name);
      }
    }
  }
  return Array.from(names).sort((a, b) => a.localeCompare(b, "es-MX"));
}
