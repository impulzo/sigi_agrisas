export interface KardexReportRequest {
  productId: string;
  /** null/undefined = "todos" — aggregate across every branch in the caller's scope. */
  branchId?: string | null;
  from: Date;
  to: Date;
}
