/** Filtros para el resumen multi-cliente del estado de cuenta. */
export interface AccountStatementSummaryFilters {
  branchId: string | null;
  search: string | null;
  from: Date | null;
  to: Date | null;
  onlyWithBalance: boolean;
}

/** Filtros para el desglose (libro mayor) de un cliente. */
export interface AccountStatementLedgerFilters {
  branchId: string | null;
  from: Date | null;
  to: Date | null;
}
