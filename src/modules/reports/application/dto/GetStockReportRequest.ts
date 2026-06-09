export interface GetStockReportRequest {
  branchId?: string | null;
  departmentId?: string | null;
  includeZeroStock: boolean;
  generatedBy: { userId: string; email: string };
}
