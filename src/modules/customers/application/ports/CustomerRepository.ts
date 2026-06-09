import { Customer } from "../../domain/entities/Customer";

export interface CreateCustomerData {
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
  creditLimit?: number | null;
  isActive?: boolean;
}

export interface UpdateCustomerData {
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
  creditLimit?: number | null;
  isActive?: boolean;
}

export interface FindAllOptions {
  page: number;
  pageSize: number;
  includeInactive: boolean;
  search?: string;
}

export interface CustomerRepository {
  findAll(options: FindAllOptions): Promise<{ items: Customer[]; total: number }>;
  findById(id: string): Promise<Customer | null>;
  create(data: CreateCustomerData): Promise<Customer>;
  update(id: string, data: UpdateCustomerData): Promise<Customer>;
  softDelete(id: string): Promise<void>;
}
