import { Decimal } from "decimal.js";
import { CashCutRawRow } from "../value-objects/CashCutFilters";

export interface AssembledCollectionsRow {
  paymentId: string;
  saleId: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  factura: string;
  amount: number;
  paymentMethodName: string;
  reference: string | null;
  collectedAt: Date;
}

export interface CollectionsByCustomerRow {
  customerId: string;
  customerCode: string;
  customerName: string;
  count: number;
  total: number;
}

export interface CollectionsByTicketRow {
  saleId: string;
  factura: string;
  customerName: string;
  count: number;
  total: number;
}

export interface AssembledCollections {
  rows: AssembledCollectionsRow[];
  totals: { totalCollected: number };
  byCustomer: CollectionsByCustomerRow[];
  byTicket: CollectionsByTicketRow[];
}

/**
 * Servicio de dominio puro (sin I/O). Reusa las filas crudas de `CashCutRepository`
 * (misma fuente que `CashCutAssembler`) pero agrupa por cliente y por ticket abonado
 * en vez de por forma de pago — ver design.md D3. Redondeo banker's a 4 decimales.
 */
export class CollectionsAssembler {
  private static round(n: number): number {
    return new Decimal(n).toDecimalPlaces(4).toNumber();
  }

  static assemble(rawRows: CashCutRawRow[]): AssembledCollections {
    const rows: AssembledCollectionsRow[] = rawRows.map((r) => ({
      paymentId: r.paymentId,
      saleId: r.saleId,
      customerId: r.customerId,
      customerCode: r.customerCode,
      customerName: r.customerName,
      factura: r.factura,
      amount: this.round(r.amount),
      paymentMethodName: r.paymentMethodName,
      reference: r.reference,
      collectedAt: r.collectedAt,
    }));

    const totalCollected = rows.reduce((acc, r) => acc + r.amount, 0);

    const byCustomerMap = new Map<string, CollectionsByCustomerRow>();
    for (const r of rows) {
      const existing = byCustomerMap.get(r.customerId) ?? {
        customerId: r.customerId,
        customerCode: r.customerCode,
        customerName: r.customerName,
        count: 0,
        total: 0,
      };
      existing.count += 1;
      existing.total += r.amount;
      byCustomerMap.set(r.customerId, existing);
    }
    const byCustomer = [...byCustomerMap.values()]
      .map((row) => ({ ...row, total: this.round(row.total) }))
      .sort((a, b) => b.total - a.total);

    const byTicketMap = new Map<string, CollectionsByTicketRow>();
    for (const r of rows) {
      const existing = byTicketMap.get(r.saleId) ?? {
        saleId: r.saleId,
        factura: r.factura,
        customerName: r.customerName,
        count: 0,
        total: 0,
      };
      existing.count += 1;
      existing.total += r.amount;
      byTicketMap.set(r.saleId, existing);
    }
    const byTicket = [...byTicketMap.values()]
      .map((row) => ({ ...row, total: this.round(row.total) }))
      .sort((a, b) => b.total - a.total);

    return {
      rows,
      totals: { totalCollected: this.round(totalCollected) },
      byCustomer,
      byTicket,
    };
  }
}
