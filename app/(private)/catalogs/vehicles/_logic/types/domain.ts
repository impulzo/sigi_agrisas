export interface Vehicle {
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
  createdAt: Date;
  updatedAt: Date;
}
