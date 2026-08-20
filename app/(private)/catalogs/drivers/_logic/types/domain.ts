export interface Driver {
  id: string;
  code: string;
  name: string;
  rfc: string | null;
  licenseNumber: string;
  notes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
