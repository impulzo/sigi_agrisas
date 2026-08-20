export interface CreateDriverRequest {
  code: string;
  name: string;
  rfc?: string | null;
  licenseNumber: string;
  notes?: string | null;
  isActive?: boolean;
}
