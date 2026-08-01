export interface AccountStatementsSummaryFilters {
  branchId?: string;
  search?: string;
  from?: string;
  to?: string;
  onlyWithBalance?: boolean;
  page?: number;
  pageSize?: number;
}

export type LedgerSort = "date" | "invoice" | "serie";

export interface AccountStatementLedgerFilters {
  branchId?: string;
  from?: string;
  to?: string;
  /** `true` (Histórico, default) o `false` (General = solo deudas activas). */
  history?: boolean;
  /** Orden de presentación de la grilla. */
  sort?: LedgerSort;
}
