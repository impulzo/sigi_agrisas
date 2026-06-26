export interface TaxRateDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  rate: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListTaxRatesResponse {
  items: TaxRateDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateTaxRateBody {
  code: string;
  name: string;
  description?: string | null;
  rate: number;
  isActive?: boolean;
}

export interface UpdateTaxRateBody {
  name?: string;
  description?: string | null;
  rate?: number;
  isActive?: boolean;
}
