export interface UpdateProductRequest {
  name?: string;
  unit?: string;
  satProductCode?: string | null;
  departmentId?: string;
  ivaRate?: number | null;
  iepsRate?: number | null;
  isActive?: boolean;
}
