export interface DriverDto {
  id: string;
  code: string;
  name: string;
  rfc: string | null;
  licenseNumber: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
