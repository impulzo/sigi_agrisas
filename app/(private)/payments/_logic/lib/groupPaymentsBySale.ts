import type { SalePaymentStatus } from "../types/domain";

export interface GroupablePayment {
  id: string;
  saleId: string | null;
  saleFolioCode?: string | null;
  customerName?: string | null;
  saleTotal: number | string | null;
  saleDueAmount: number | string | null;
  salePaymentStatus: SalePaymentStatus | null;
}

export interface PaymentGroup<T> {
  /** Stable React key / toggle-state key — never null, unlike `saleId`. */
  groupKey: string;
  /** `null` = abono a saldo general (sin venta asociada). */
  saleId: string | null;
  saleFolioCode: string | null;
  customerName: string;
  saleTotal: number | null;
  saleDueAmount: number | null;
  salePaymentStatus: SalePaymentStatus | null;
  payments: T[];
}

/**
 * Agrupa client-side por saleId, preservando el orden de primera aparición.
 * Opera solo sobre los items ya cargados (una página) — un ticket con abonos
 * repartidos entre 2 páginas de resultados aparece como grupo separado en cada una.
 * Abonos a saldo general (`saleId=null`) nunca se colapsan entre sí: cada uno
 * forma su propio grupo, keyed por su propio `id`.
 */
export function groupPaymentsBySale<T extends GroupablePayment>(items: T[]): PaymentGroup<T>[] {
  const order: string[] = [];
  const bySale = new Map<string, T[]>();

  for (const item of items) {
    const key = item.saleId ?? `account:${item.id}`;
    let bucket = bySale.get(key);
    if (!bucket) {
      bucket = [];
      bySale.set(key, bucket);
      order.push(key);
    }
    bucket.push(item);
  }

  return order.map((key) => {
    const payments = bySale.get(key)!;
    const first = payments[0];
    return {
      groupKey: key,
      saleId: first.saleId,
      saleFolioCode: first.saleFolioCode ?? null,
      customerName: first.customerName ?? "",
      saleTotal: first.saleTotal !== null ? Number(first.saleTotal) : null,
      saleDueAmount: first.saleDueAmount !== null ? Number(first.saleDueAmount) : null,
      salePaymentStatus: first.salePaymentStatus,
      payments,
    };
  });
}
