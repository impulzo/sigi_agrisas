export interface ProviderDto {
  id: string;
  code: string;
  name: string;
  rfc: string | null;
  legalName: string | null;
  taxRegime: string | null;
  cfdiUse: string | null;
  taxZipCode: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  contactName: string | null;
  notes: string | null;
  creditLimit: number | null;
  currentBalance: number;
  initialBalance: number;
  creditDays: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListProvidersResponse {
  items: ProviderDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListProvidersParams {
  page: number;
  pageSize: number;
  includeInactive?: boolean;
  search?: string;
}

export interface CreateProviderBody {
  code: string;
  name: string;
  rfc?: string | null;
  legalName?: string | null;
  taxRegime?: string | null;
  cfdiUse?: string | null;
  taxZipCode?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  contactName?: string | null;
  notes?: string | null;
  creditLimit?: number | null;
  initialBalance?: number;
  creditDays?: number;
  isActive?: boolean;
}

export interface UpdateProviderBody {
  name?: string;
  rfc?: string | null;
  legalName?: string | null;
  taxRegime?: string | null;
  cfdiUse?: string | null;
  taxZipCode?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  contactName?: string | null;
  notes?: string | null;
  creditLimit?: number | null;
  initialBalance?: number;
  creditDays?: number;
  isActive?: boolean;
}
