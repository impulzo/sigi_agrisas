import { Vehicle } from "../../domain/entities/Vehicle";
import { VehicleDto } from "../dto/VehicleDto";

export function toVehicleDto(vehicle: Vehicle): VehicleDto {
  return {
    id: vehicle.id,
    code: vehicle.code,
    plate: vehicle.plate,
    vehicleConfig: vehicle.vehicleConfig,
    permitType: vehicle.permitType,
    permitNumber: vehicle.permitNumber,
    insuranceCompany: vehicle.insuranceCompany,
    insurancePolicy: vehicle.insurancePolicy,
    notes: vehicle.notes,
    isActive: vehicle.isActive,
    createdAt: vehicle.createdAt.toISOString(),
    updatedAt: vehicle.updatedAt.toISOString(),
  };
}
