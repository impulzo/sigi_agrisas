export interface ListProductsRequest {
  page: number;
  pageSize: number;
  includeInactive: boolean;
  search?: string;
  departmentId?: string;
  branchId?: string;
  satProductCode?: string;
}
