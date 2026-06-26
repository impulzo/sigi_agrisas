export interface UpdateProductRequest {
  name?: string;
  unit?: string;
  satProductCode?: string | null;
  departmentId?: string;
  taxRateId?: string | null;
  ivaRate?: number | null;
  iepsRate?: number | null;
  isActive?: boolean;
}
