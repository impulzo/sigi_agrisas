/**
 * Normalización de nombre de producto para matching (no para persistir).
 * Usada por el seeder de Tlaxiaco para encontrar el `code` real de un
 * producto ya catalogado bajo otro nombre/redacción.
 */

const FILLER_TOKENS = new Set(["DE", "CON", "Y"]);

/** Une dígito + espacio + letra(s) de unidad corta (<=4, ej. "L", "KG", "GRS") — "10 L" y "10L" normalizan igual. Letras más largas (ej. "4 TIEMPOS") no colapsan, para no fusionar palabras reales. */
const DIGIT_UNIT_SPACE = /(\d)\s+([A-Z]{1,4})(?=\s|$)/g;

export function normalizeProductNameForMatching(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/\s+/)
    .filter((token) => token.length > 0 && !FILLER_TOKENS.has(token))
    .join(" ")
    .replace(DIGIT_UNIT_SPACE, "$1$2")
    .trim();
}
