export interface ProductDto {
  id: string;
  code: string;
  name: string;
  unit: string;
  satProductCode: string | null;
  departmentId: string;
  departmentName: string;
  taxRateId: string | null;
  taxRateCode: string | null;
  providerId: string | null;
  providerName: string | null;
  ivaRate: number | null;
  iepsRate: number | null;
  imageUrl: string | null;
  isTaxable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
