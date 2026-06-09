export interface GetPaymentHistoryReportRequest {
  branchId?: string | null;
  customerId?: string | null;
  startDate?: Date | null;
  endDate?: Date | null;
  generatedBy: { userId: string; email: string };
}
