import type { WaybillStatus, WaybillAddressDto, WaybillItemDto } from "./api";

export type { WaybillStatus, WaybillAddressDto };
export type WaybillItem = WaybillItemDto;

export interface Waybill {
  id: string;
  folioCode: string;
  originBranchId: string;
  destinationBranchId: string;
  status: WaybillStatus;
  originAddress: WaybillAddressDto;
  destinationAddress: WaybillAddressDto;
  vehiclePlate: string;
  vehicleConfig: string;
  vehiclePermitType: string;
  vehiclePermitNumber: string;
  insuranceCompany: string;
  insurancePolicy: string;
  driverName: string;
  driverRfc: string | null;
  driverLicenseNumber: string;
  distanceKm: number;
  departureAt: Date;
  arrivalAt: Date;
  cfdiUuid: string | null;
  facturamaCfdiId: string | null;
  xmlUrl: string | null;
  pdfUrl: string | null;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WaybillDetail extends Waybill {
  items: WaybillItem[];
}

export interface WaybillSummary {
  id: string;
  folioCode: string;
  originBranchId: string;
  destinationBranchId: string;
  status: WaybillStatus;
  departureAt: Date;
  arrivalAt: Date;
  createdAt: Date;
}

export interface WaybillFilters {
  page: number;
  pageSize: number;
  status: WaybillStatus[];
  branchId?: string;
  from?: string;
  to?: string;
}

export interface VehicleInput {
  plate: string;
  config: string;
  permitType: string;
  permitNumber: string;
  insuranceCompany: string;
  insurancePolicy: string;
}

export interface DriverInput {
  name: string;
  rfc: string;
  licenseNumber: string;
}
