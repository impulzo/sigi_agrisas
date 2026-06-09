import { Provider } from "../../domain/entities/Provider";

export interface CreateProviderData {
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
}

export interface UpdateProviderData {
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

export interface FindAllOptions {
  page: number;
  pageSize: number;
  includeInactive: boolean;
  search?: string;
}

export interface ProviderRepository {
  findAll(options: FindAllOptions): Promise<{ items: Provider[]; total: number }>;
  findById(id: string): Promise<Provider | null>;
  create(data: CreateProviderData): Promise<Provider>;
  update(id: string, data: UpdateProviderData): Promise<Provider>;
  softDelete(id: string): Promise<void>;
}
