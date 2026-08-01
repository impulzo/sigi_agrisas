export interface KardexFilters {
  productId: string;
  /** undefined = "todos" (solo disponible con branches:access_all). */
  branchId?: string;
  from: string;
  to: string;
}

export type KardexExportFormat = "xlsx" | "pdf";
