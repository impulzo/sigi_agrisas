/**
 * Detección de errores de Prisma por código, compartida entre repositorios.
 * `target`, si se pasa, exige que el nombre de columna/índice del constraint
 * único (P2002) incluya ese substring — soporta el caso de múltiples
 * constraints únicos distintos en la misma tabla (ej. `code` vs `rfc`).
 */
export function isPrismaUniqueError(err: unknown, target?: string): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: string; meta?: { target?: string[] | string } };
  if (e.code !== "P2002") return false;
  if (!target) return true;
  const t = e.meta?.target;
  if (Array.isArray(t)) return t.some((f) => f.includes(target));
  if (typeof t === "string") return t.includes(target);
  return false;
}

export function isPrismaNotFoundError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2025";
}
