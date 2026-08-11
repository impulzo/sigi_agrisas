export interface ProviderPaymentsReportFilters {
  branchId: string | null;
  providerId: string | null;
  status: "completed" | "cancelled" | null;
  from: Date | null;
  to: Date | null;
}

export interface ProviderPaymentsReportRow {
  id: string;
  folioCode: string;
  purchaseFolioCode: string;
  providerName: string | null;
  branchName: string | null;
  amount: number;
  status: string;
  paidAt: Date;
}

export interface ProviderPaymentReportRepository {
  findAll(
    filters: ProviderPaymentsReportFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<{ items: ProviderPaymentsReportRow[]; total: number }>;
}
