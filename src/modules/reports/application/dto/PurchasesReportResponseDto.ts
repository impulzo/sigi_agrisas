export interface PurchasesReportRowDto {
  id: string;
  folioCode: string;
  providerName: string | null;
  branchName: string | null;
  subtotal: string;
  taxTotal: string;
  total: string;
  paidAmount: string;
  paymentStatus: string;
  status: string;
  purchasedAt: string;
}

export interface PurchasesReportResponseDto {
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
