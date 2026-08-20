export interface Provider {
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
  createdAt: Date;
  updatedAt: Date;
}
