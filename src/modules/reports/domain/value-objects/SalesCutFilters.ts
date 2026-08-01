/** Filtros del corte de ventas. `from`/`to` ya resueltos (preset "hoy" en el controller). */
export interface SalesCutFilters {
  branchId: string | null;
  cashierId: string | null;
  paymentMethodId: string | null;
  from: Date;
  to: Date;
}

/** Totales de ventas activas (completed + edited) del periodo. */
export interface ActiveTotals {
  grossSales: number;
  ticketCount: number;
  subtotal: number;
  taxTotal: number;
}

/** Ventas canceladas del periodo (reportadas aparte, no suman al neto). */
export interface CancelledTotals {
  count: number;
  total: number;
}

/** Split IVA/IEPS global, agregado desde `sale_items` de ventas activas. */
export interface TaxSplit {
  ivaTotal: number;
  iepsTotal: number;
}

/** Fila de un desglose (por método/cajero/sucursal/día). */
export interface BreakdownRow {
  key: string;
  label: string;
  ticketCount: number;
  subtotal: number;
  taxTotal: number;
  total: number;
}

/** Agregado de abonos cobrados (customer_payments completed) del periodo. */
export interface PaymentsAgg {
  count: number;
  total: number;
}

/** Agregado de devoluciones (returns completed) del periodo. */
export interface ReturnsAgg {
  count: number;
  total: number;
}

/** Bolsa de agregados crudos que devuelve el repositorio. */
export interface SalesCutAggregates {
  active: ActiveTotals;
  cancelled: CancelledTotals;
  taxSplit: TaxSplit;
  byPaymentMethod: BreakdownRow[];
  byDay: BreakdownRow[];
  byCashier: BreakdownRow[];
  byBranch: BreakdownRow[];
  paymentsReceived: PaymentsAgg;
  returnsRefunded: ReturnsAgg;
}
