export interface UpdateDriverRequest {
  name?: string;
  rfc?: string | null;
  licenseNumber?: string;
  notes?: string | null;
  isActive?: boolean;
}
