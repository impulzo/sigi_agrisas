export interface ProductDto {
  id: string;
  code: string;
  name: string;
  unit: string;
  satProductCode: string | null;
  departmentId: string;
  departmentName: string;
  ivaRate: number | null;
  iepsRate: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
