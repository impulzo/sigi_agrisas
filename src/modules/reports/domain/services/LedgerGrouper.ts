import { AccountMovement, LedgerSort } from "../value-objects/AccountMovement";

/**
 * Grupo de presentación: una venta y los abonos ligados a ella (`payments[].saleId === sale.id`),
 * o `sale: null` para el bloque de abonos cuya venta no está presente en `movements` (cae fuera
 * del rango de fechas consultado, folded en `openingBalance`).
 */
export interface LedgerGroup {
  sale: AccountMovement | null;
  payments: AccountMovement[];
}

function byDate(a: AccountMovement, b: AccountMovement): number {
  return a.date.getTime() - b.date.getTime();
}

function byInvoice(a: LedgerGroup, b: LedgerGroup): number {
  return (
    a.sale!.folioNumber - b.sale!.folioNumber ||
    a.sale!.folioCode.localeCompare(b.sale!.folioCode) ||
    a.sale!.date.getTime() - b.sale!.date.getTime()
  );
}

function bySerie(a: LedgerGroup, b: LedgerGroup): number {
  return (
    a.sale!.folioCode.localeCompare(b.sale!.folioCode) ||
    a.sale!.folioNumber - b.sale!.folioNumber ||
    a.sale!.date.getTime() - b.sale!.date.getTime()
  );
}

/**
 * Agrupa movimientos YA CALCULADOS por `AccountLedgerBuilder` (debit/credit/runningBalance
 * intactos) en ventas con sus abonos ligados. Servicio de dominio puro — no recalcula saldo.
 *
 * @param movements Movimientos visibles (post filtro `history`), en el mismo orden que produce
 *                  `AccountLedgerBuilder.build()`.
 * @param sort Criterio de orden de los grupos (por su venta); los abonos dentro de un grupo
 *             siempre quedan en orden cronológico ascendente. El grupo huérfano (`sale: null`)
 *             siempre va al final, sin importar `sort`.
 */
export function groupLedgerBySale(movements: AccountMovement[], sort: LedgerSort): LedgerGroup[] {
  const sales: AccountMovement[] = [];
  const paymentsBySale = new Map<string, AccountMovement[]>();

  for (const m of movements) {
    if (m.kind === "sale") {
      sales.push(m);
      continue;
    }
    if (m.saleId) {
      const list = paymentsBySale.get(m.saleId) ?? [];
      list.push(m);
      paymentsBySale.set(m.saleId, list);
    }
  }

  const saleIds = new Set(sales.map((s) => s.id));
  const groups: LedgerGroup[] = sales.map((sale) => ({
    sale,
    payments: (paymentsBySale.get(sale.id) ?? []).slice().sort(byDate),
  }));

  const orphanPayments: AccountMovement[] = [];
  for (const [saleId, payments] of paymentsBySale) {
    if (!saleIds.has(saleId)) orphanPayments.push(...payments);
  }

  const sortedGroups =
    sort === "date" ? groups : [...groups].sort(sort === "invoice" ? byInvoice : bySerie);

  if (orphanPayments.length > 0) {
    orphanPayments.sort(byDate);
    sortedGroups.push({ sale: null, payments: orphanPayments });
  }

  return sortedGroups;
}
