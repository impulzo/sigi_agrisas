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

export interface ListDriversResponse {
  items: DriverDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListDriversParams {
  page: number;
  pageSize: number;
  search?: string;
  includeInactive?: boolean;
}

export interface CreateDriverBody {
  code: string;
  name: string;
  rfc?: string | null;
  licenseNumber: string;
  notes?: string | null;
  isActive?: boolean;
}

export interface UpdateDriverBody {
  name?: string;
  rfc?: string | null;
  licenseNumber?: string;
  notes?: string | null;
  isActive?: boolean;
}
