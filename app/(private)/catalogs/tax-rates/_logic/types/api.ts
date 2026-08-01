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

export interface CreateTaxRateBody {
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

export interface UpdateTaxRateBody {
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
