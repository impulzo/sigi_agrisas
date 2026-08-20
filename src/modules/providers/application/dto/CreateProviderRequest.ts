export interface CreateProviderRequest {
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
