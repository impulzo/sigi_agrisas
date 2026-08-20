export interface UpdateProductRequest {
  name?: string;
  unit?: string;
  satProductCode?: string | null;
  departmentId?: string;
  taxRateId?: string | null;
  ivaRate?: number | null;
  iepsRate?: number | null;
  manufactureDate?: string | null;
  acquisitionPrice?: number | null;
  isActive?: boolean;
}
