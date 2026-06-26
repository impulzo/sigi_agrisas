/**
 * Normalización compartida de codes para seeders de inventario.
 * Extraído de `prisma/seeds/inventory.ts` para reuso por el generador
 * `data/generate-inventory-data.ts` y cualquier validación futura.
 */

export const CODE_REGEX = /^[A-Z0-9_]{1,32}$/;

/** Normaliza el nombre de un departamento a un code válido `^[A-Z0-9_]{1,32}$`. */
export function normalizeDepartmentCode(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, 32);
}

/** Normaliza la CLAVE/Articulo de un producto a un code válido `^[A-Z0-9_]{1,32}$`. */
export function normalizeProductCode(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toUpperCase()
    .replace(/[\s\-]+/g, "_")
    .replace(/\*/g, "")
    .replace(/[^A-Z0-9_]/g, "")
    .slice(0, 32);
}

export function isBlank(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  return false;
}
