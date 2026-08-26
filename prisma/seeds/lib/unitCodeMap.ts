/**
 * Mapeo compartido de texto crudo de "Unidad" del Excel a clave real
 * c_ClaveUnidad (SAT). Extraído de `data/generate-inventory-data.ts` para
 * reuso por `data/generate-inventario-tiendas-data.ts`.
 */

export const UNIT_CODE_MAP: Record<string, string> = {
  PZA: "H87", // Pieza
  NA: "ACT", // Actividad (líneas no físicas: descuentos, servicios)
};

export const DEFAULT_UNIT_CODE = "H87"; // Pieza — default de negocio

export function mapUnitCode(raw: unknown): string {
  const trimmed = String(raw ?? "").trim().toUpperCase();
  if (!trimmed) return DEFAULT_UNIT_CODE;
  const mapped = UNIT_CODE_MAP[trimmed];
  if (mapped) return mapped;
  console.warn(`Unidad no mapeada en Excel: "${trimmed}" → usando default "${DEFAULT_UNIT_CODE}"`);
  return DEFAULT_UNIT_CODE;
}
