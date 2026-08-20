import { Driver } from "../../domain/entities/Driver";
import { DriverDto } from "../dto/DriverDto";

export function toDriverDto(driver: Driver): DriverDto {
  return {
    id: driver.id,
    code: driver.code,
    name: driver.name,
    rfc: driver.rfc,
    licenseNumber: driver.licenseNumber,
    notes: driver.notes,
    isActive: driver.isActive,
    createdAt: driver.createdAt.toISOString(),
    updatedAt: driver.updatedAt.toISOString(),
  };
}
