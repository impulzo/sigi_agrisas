export interface CustomerDto {
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
  creditLimit: number | null;
  currentBalance: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
