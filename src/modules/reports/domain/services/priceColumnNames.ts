import { DepartmentPriceListDepartmentDto } from "../../application/dto/DepartmentPriceListResponseDto";

/**
 * Nombres únicos de lista de precio entre los departamentos dados.
 * Orden: el/los nombre(s) marcados `isDefault` en los datos van primero;
 * el resto se ordena alfabéticamente (es-MX).
 */
export function priceColumnNames(departments: DepartmentPriceListDepartmentDto[]): string[] {
  const isDefaultByName = new Map<string, boolean>();
  for (const dept of departments) {
    for (const product of dept.products) {
      for (const price of product.prices) {
        const current = isDefaultByName.get(price.name) ?? false;
        isDefaultByName.set(price.name, current || price.isDefault);
      }
    }
  }
  return Array.from(isDefaultByName.keys()).sort((a, b) => {
    const aDefault = isDefaultByName.get(a) ?? false;
    const bDefault = isDefaultByName.get(b) ?? false;
    if (aDefault !== bDefault) return aDefault ? -1 : 1;
    return a.localeCompare(b, "es-MX");
  });
}
