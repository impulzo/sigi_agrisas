/**
 * Resuelve el conjunto de precios efectivo de un producto para una sucursal:
 * sus overrides propios (branchId === branchId) más los precios base
 * (branchId === null) cuyo `name` no tiene override propio de esa sucursal.
 *
 * `rows` puede contener filas de otras sucursales sin afectar el resultado
 * (se ignoran) — permite pasar el resultado crudo de una query amplia.
 *
 * Genérica sobre cualquier forma con `branchId`/`name` (entidad de dominio
 * `ProductPrice` o fila cruda de Prisma) para reusarse tanto en el
 * repositorio de productos como en el reporte de lista de precios.
 */
export function resolveEffectivePrices<T extends { branchId: string | null; name: string }>(
  rows: T[],
  branchId: string
): T[] {
  const overrides = rows.filter((p) => p.branchId === branchId);
  const overrideNames = new Set(overrides.map((p) => p.name));
  const inheritedBases = rows.filter((p) => p.branchId === null && !overrideNames.has(p.name));
  return [...overrides, ...inheritedBases];
}
