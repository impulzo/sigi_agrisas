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
