export interface PurchasesReportFilters {
  branchId?: string;
  providerId?: string;
  status?: "completed" | "cancelled";
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export type ProviderPaymentsReportFilters = PurchasesReportFilters;
