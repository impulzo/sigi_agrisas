import type { SalePaymentStatus } from "../types/domain";

export interface GroupablePayment {
  id: string;
  saleId: string;
  saleFolioCode?: string | null;
  customerName?: string | null;
  saleTotal: number | string;
  saleDueAmount: number | string;
  salePaymentStatus: SalePaymentStatus;
}

export interface PaymentGroup<T> {
  saleId: string;
  saleFolioCode: string;
  customerName: string;
  saleTotal: number;
  saleDueAmount: number;
  salePaymentStatus: SalePaymentStatus;
  payments: T[];
}

/**
 * Agrupa client-side por saleId, preservando el orden de primera aparición.
 * Opera solo sobre los items ya cargados (una página) — un ticket con abonos
 * repartidos entre 2 páginas de resultados aparece como grupo separado en cada una.
 */
export function groupPaymentsBySale<T extends GroupablePayment>(items: T[]): PaymentGroup<T>[] {
  const order: string[] = [];
  const bySale = new Map<string, T[]>();

  for (const item of items) {
    let bucket = bySale.get(item.saleId);
    if (!bucket) {
      bucket = [];
      bySale.set(item.saleId, bucket);
      order.push(item.saleId);
    }
    bucket.push(item);
  }

  return order.map((saleId) => {
    const payments = bySale.get(saleId)!;
    const first = payments[0];
    return {
      saleId,
      saleFolioCode: first.saleFolioCode ?? "",
      customerName: first.customerName ?? "",
      saleTotal: Number(first.saleTotal),
      saleDueAmount: Number(first.saleDueAmount),
      salePaymentStatus: first.salePaymentStatus,
      payments,
    };
  });
}
