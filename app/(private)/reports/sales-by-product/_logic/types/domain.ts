export type SalesByProductGroupBy = "customer" | "department" | "product";

export interface SalesByProductFilters {
  branchId?: string;
  departmentId?: string;
  customerId?: string;
  from?: string;
  to?: string;
}
