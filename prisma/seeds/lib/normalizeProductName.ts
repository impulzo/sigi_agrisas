/**
 * Normalización de nombre de producto para matching (no para persistir).
 * Usada por el seeder de Tlaxiaco para encontrar el `code` real de un
 * producto ya catalogado bajo otro nombre/redacción.
 */

const FILLER_TOKENS = new Set(["DE", "CON", "Y"]);

export function normalizeProductNameForMatching(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .split(/\s+/)
    .filter((token) => token.length > 0 && !FILLER_TOKENS.has(token))
    .join(" ")
    .trim();
}
