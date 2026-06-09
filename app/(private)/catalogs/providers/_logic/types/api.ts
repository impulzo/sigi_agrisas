export interface ProviderDto {
  id: string;
  code: string;
  name: string;
  rfc: string;
  legalName: string | null;
  taxRegime: string | null;
  cfdiUse: string | null;
  taxZipCode: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  contactName: string | null;
  notes: string | null;
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
  rfc: string;
  legalName?: string | null;
  taxRegime?: string | null;
  cfdiUse?: string | null;
  taxZipCode?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  contactName?: string | null;
  notes?: string | null;
  isActive?: boolean;
}

export interface UpdateProviderBody {
  name?: string;
  rfc?: string;
  legalName?: string | null;
  taxRegime?: string | null;
  cfdiUse?: string | null;
  taxZipCode?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  contactName?: string | null;
  notes?: string | null;
  isActive?: boolean;
}
