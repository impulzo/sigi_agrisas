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

export interface CreateTaxRateRequest {
  code: string;
  name: string;
  description?: string | null;
  rate: number;
  isActive?: boolean;
}

export interface UpdateTaxRateRequest {
  name?: string;
  description?: string | null;
  rate?: number;
  isActive?: boolean;
}

import { TaxRate } from "../../domain/entities/TaxRate";

export function toTaxRateDto(taxRate: TaxRate): TaxRateDto {
  return {
    id: taxRate.id,
    code: taxRate.code,
    name: taxRate.name,
    description: taxRate.description,
    rate: taxRate.rate,
    isActive: taxRate.isActive,
    createdAt: taxRate.createdAt.toISOString(),
    updatedAt: taxRate.updatedAt.toISOString(),
  };
}
