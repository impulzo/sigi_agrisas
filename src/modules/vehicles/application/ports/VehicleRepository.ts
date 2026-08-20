import { Vehicle } from "../../domain/entities/Vehicle";

export interface CreateVehicleData {
  code: string;
  plate: string;
  vehicleConfig: string;
  permitType: string;
  permitNumber: string;
  insuranceCompany: string;
  insurancePolicy: string;
  notes?: string | null;
}

export interface UpdateVehicleData {
  plate?: string;
  vehicleConfig?: string;
  permitType?: string;
  permitNumber?: string;
  insuranceCompany?: string;
  insurancePolicy?: string;
  notes?: string | null;
  isActive?: boolean;
}

export interface FindAllOptions {
  page: number;
  pageSize: number;
  includeInactive: boolean;
  search?: string;
}

export interface VehicleRepository {
  findAll(options: FindAllOptions): Promise<{ items: Vehicle[]; total: number }>;
  findById(id: string): Promise<Vehicle | null>;
  create(data: CreateVehicleData): Promise<Vehicle>;
  update(id: string, data: UpdateVehicleData): Promise<Vehicle>;
}
