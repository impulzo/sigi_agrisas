import { DepartmentPriceListDepartmentDto } from "../../application/dto/DepartmentPriceListResponseDto";

/**
 * Rango de negocio por nombre de precio — mismo patrón que
 * `sortProductPricesForDisplay` (catálogo/POS): default primero, luego
 * subdistribuidor, luego distribuidor, el resto al final.
 */
function priorityOf(name: string, isDefault: boolean): number {
  if (isDefault) return 0;
  if (/subdis/i.test(name)) return 1;
  if (/distri/i.test(name)) return 2;
  return 3;
}

/**
 * Nombres únicos de lista de precio entre los departamentos dados.
 * Orden: rango de negocio (`priorityOf`); dentro del mismo rango,
 * alfabético (es-MX).
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
    const rankDiff = priorityOf(a, isDefaultByName.get(a) ?? false) - priorityOf(b, isDefaultByName.get(b) ?? false);
    if (rankDiff !== 0) return rankDiff;
    return a.localeCompare(b, "es-MX");
  });
}
