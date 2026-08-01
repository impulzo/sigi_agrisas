export type PeriodMode = "today" | "range";

export interface SalesCutFilters {
  mode: PeriodMode;
  from?: string;
  to?: string;
  branchId?: string;
  cashierId?: string;
  paymentMethodId?: string;
}
