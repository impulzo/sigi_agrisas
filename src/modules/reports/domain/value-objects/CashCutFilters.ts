/** Filtros del corte de caja (cobranza). `from`/`to` obligatorios (sin preset "hoy"). */
export interface CashCutFilters {
  branchId: string | null;
  customerId: string | null;
  paymentMethodId: string | null;
  from: Date;
  to: Date;
}

/** Fila cruda de cobranza devuelta por el repositorio (un abono, sin cálculos derivados). */
export interface CashCutRawRow {
  paymentId: string;
  customerCode: string;
  docto: string;
  factura: string;
  customerName: string;
  facturaDate: Date;
  amount: number;
  paymentMethodId: string;
  paymentMethodCode: string;
  paymentMethodName: string;
  reference: string | null;
  collectedAt: Date;
  saleTaxTotal: number;
  saleSubtotal: number;
  saleTotal: number;
}
