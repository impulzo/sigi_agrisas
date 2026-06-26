import { TaxRate } from "../../domain/entities/TaxRate";

export interface FindAllTaxRatesOptions {
  page: number;
  pageSize: number;
  includeInactive?: boolean;
}

export interface CreateTaxRateData {
  code: string;
  name: string;
  description?: string | null;
  rate: number;
  isActive?: boolean;
}

export interface UpdateTaxRateData {
  name?: string;
  description?: string | null;
  rate?: number;
  isActive?: boolean;
}

export interface TaxRateRepository {
  findAll(options: FindAllTaxRatesOptions): Promise<{ items: TaxRate[]; total: number }>;
  findById(id: string): Promise<TaxRate | null>;
  findByCode(code: string): Promise<TaxRate | null>;
  create(data: CreateTaxRateData): Promise<TaxRate>;
  update(id: string, data: UpdateTaxRateData): Promise<TaxRate>;
  findActiveProductCount(id: string): Promise<number>;
}
