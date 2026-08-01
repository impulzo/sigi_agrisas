export interface TaxRateDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  satTaxCode: string;
  factorType: string;
  displayValue: number;
  rate: number;
  transferredAccount: string | null;
  pendingTransferredAccount: string | null;
  creditedAccount: string | null;
  pendingCreditedAccount: string | null;
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
  satTaxCode: string;
  factorType: string;
  displayValue: number;
  rate: number;
  transferredAccount?: string | null;
  pendingTransferredAccount?: string | null;
  creditedAccount?: string | null;
  pendingCreditedAccount?: string | null;
  isActive?: boolean;
}

export interface UpdateTaxRateRequest {
  name?: string;
  description?: string | null;
  satTaxCode?: string;
  factorType?: string;
  displayValue?: number;
  rate?: number;
  transferredAccount?: string | null;
  pendingTransferredAccount?: string | null;
  creditedAccount?: string | null;
  pendingCreditedAccount?: string | null;
  isActive?: boolean;
}

import { TaxRate } from "../../domain/entities/TaxRate";

export function toTaxRateDto(taxRate: TaxRate): TaxRateDto {
  return {
    id: taxRate.id,
    code: taxRate.code,
    name: taxRate.name,
    description: taxRate.description,
    satTaxCode: taxRate.satTaxCode,
    factorType: taxRate.factorType,
    displayValue: taxRate.displayValue,
    rate: taxRate.rate,
    transferredAccount: taxRate.transferredAccount,
    pendingTransferredAccount: taxRate.pendingTransferredAccount,
    creditedAccount: taxRate.creditedAccount,
    pendingCreditedAccount: taxRate.pendingCreditedAccount,
    isActive: taxRate.isActive,
    createdAt: taxRate.createdAt.toISOString(),
    updatedAt: taxRate.updatedAt.toISOString(),
  };
}
