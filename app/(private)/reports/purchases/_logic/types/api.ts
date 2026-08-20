export interface PurchasesReportRowDto {
  id: string;
  folioCode: string;
  providerName: string | null;
  branchName: string | null;
  subtotal: string;
  taxTotal: string;
  total: string;
  paidAmount: string;
  balance: string;
  paymentStatus: string;
  status: string;
  purchasedAt: string;
}

export interface PurchasesReportDto {
  generatedAt: string;
  generatedBy: { userId: string; email: string };
  filters: {
    branchId: string | null;
    providerId: string | null;
    status: string | null;
    from: string | null;
    to: string | null;
  };
  totals: { count: number; total: string };
  rows: PurchasesReportRowDto[];
}

export interface ProviderPaymentsReportRowDto {
  id: string;
  folioCode: string;
  purchaseFolioCode: string;
  providerName: string | null;
  branchName: string | null;
  amount: string;
  status: string;
  paidAt: string;
  providerInitialBalance: string | null;
  providerCurrentBalance: string | null;
}

export interface ProviderPaymentsReportDto {
  generatedAt: string;
  generatedBy: { userId: string; email: string };
  filters: {
    branchId: string | null;
    providerId: string | null;
    status: string | null;
    from: string | null;
    to: string | null;
  };
  totals: { count: number; total: string };
  rows: ProviderPaymentsReportRowDto[];
}
