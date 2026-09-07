import { NextResponse } from "next/server";

type ErrorClass = new (...args: never[]) => Error;

/**
 * Recorre `table` en orden y devuelve el `NextResponse` del primer error de
 * dominio que matchee vía `instanceof`, o `null` si ninguno matchea (el
 * caller decide el fallback, típicamente `throw err` o un 500 genérico).
 */
export function mapDomainError(
  err: unknown,
  table: Array<[ErrorClass, number]>
): NextResponse | null {
  for (const [ErrClass, status] of table) {
    if (err instanceof ErrClass) {
      return NextResponse.json({ error: (err as Error).message }, { status });
    }
  }
  return null;
}
