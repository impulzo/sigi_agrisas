export interface CreateProductRequest {
  code: string;
  name: string;
  unit: string;
  departmentId: string;
  taxRateId?: string | null;
  satProductCode?: string | null;
  ivaRate?: number | null;
  iepsRate?: number | null;
  manufactureDate?: string | null;
  acquisitionPrice?: number | null;
  isTaxable?: boolean;
  isActive?: boolean;
}
