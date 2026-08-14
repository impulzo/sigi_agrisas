import { PrismaClient } from "@prisma/client";

/** Structural subset satisfied by both `PrismaClient` and `Prisma.TransactionClient`. */
type PrismaLike = { satUnitOfMeasure: Pick<PrismaClient["satUnitOfMeasure"], "findMany"> };

/**
 * `Product.unit`/`InventoryMovement.unit` es una columna suelta (sin FK a
 * `sat_units_of_measure`, mismo criterio que `satProductCode`) — permite
 * resembrar el catálogo sin romper referencias, pero obliga a resolver la
 * `description` humana por fuera cada vez que se muestra al usuario.
 * Códigos que no matchean el catálogo (datos legacy pre-migración, texto
 * libre como "kg") simplemente no aparecen en el mapa devuelto — el caller
 * hace fallback al valor crudo.
 */
export async function resolveUnitDescriptions(
  prisma: PrismaLike,
  codes: Array<string | null | undefined>
): Promise<Map<string, string>> {
  const uniqueCodes = Array.from(new Set(codes.filter((c): c is string => !!c)));
  if (uniqueCodes.length === 0) return new Map();

  const rows = await prisma.satUnitOfMeasure.findMany({
    where: { code: { in: uniqueCodes } },
    select: { code: true, description: true },
  });

  return new Map(rows.map((r) => [r.code, r.description]));
}
