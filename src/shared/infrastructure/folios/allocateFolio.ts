import { Prisma } from "@prisma/client";
import { InactiveResourceError } from "@/modules/pos/domain/errors/InactiveResourceError";

type TxClient = Prisma.TransactionClient;

/**
 * Atomically increments the folio's current_number and returns the new number
 * plus the formatted folio code. Throws InactiveResourceError when the folio
 * row is not found with is_active=true (Prisma P2025).
 */
export async function allocateFolio(
  tx: TxClient,
  folioId: string
): Promise<{ folioNumber: number; folioCode: string }> {
  const folio = await tx.folio
    .update({
      where: { id: folioId, isActive: true },
      data: { currentNumber: { increment: 1 } },
      select: { currentNumber: true, code: true, prefix: true },
    })
    .catch((err) => {
      if ((err as { code?: string }).code === "P2025") {
        throw new InactiveResourceError("Folio");
      }
      throw err;
    });
  const folioCode = folio.prefix
    ? `${folio.prefix}${String(folio.currentNumber).padStart(6, "0")}`
    : `${folio.code}-${folio.currentNumber}`;
  return { folioNumber: folio.currentNumber, folioCode };
}
