export interface CreateProductRequest {
  code: string;
  name: string;
  unit: string;
  departmentId: string;
  taxRateId?: string | null;
  satProductCode?: string | null;
  ivaRate?: number | null;
  iepsRate?: number | null;
  isActive?: boolean;
}
