export interface VehicleDto {
  id: string;
  code: string;
  plate: string;
  vehicleConfig: string;
  permitType: string;
  permitNumber: string;
  insuranceCompany: string;
  insurancePolicy: string;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListVehiclesResponse {
  items: VehicleDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListVehiclesParams {
  page: number;
  pageSize: number;
  search?: string;
  includeInactive?: boolean;
}

export interface CreateVehicleBody {
  code: string;
  plate: string;
  vehicleConfig: string;
  permitType: string;
  permitNumber: string;
  insuranceCompany: string;
  insurancePolicy: string;
  notes?: string | null;
  isActive?: boolean;
}

export interface UpdateVehicleBody {
  plate?: string;
  vehicleConfig?: string;
  permitType?: string;
  permitNumber?: string;
  insuranceCompany?: string;
  insurancePolicy?: string;
  notes?: string | null;
  isActive?: boolean;
}
