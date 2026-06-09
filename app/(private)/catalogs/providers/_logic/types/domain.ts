export interface Provider {
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
  createdAt: Date;
  updatedAt: Date;
}
