import type { WaybillStatus, WaybillType, WaybillAddressDto, WaybillItemDto } from "./api";

export type { WaybillStatus, WaybillType, WaybillAddressDto };
export type WaybillItem = WaybillItemDto;

export interface Waybill {
  id: string;
  folioCode: string;
  originBranchId: string;
  destinationBranchId: string | null;
  destinationCustomerId: string | null;
  destinationCustomerName?: string;
  destinationCustomerCode?: string;
  saleId: string | null;
  type: WaybillType;
  status: WaybillStatus;
  notes: string | null;
  originAddress: WaybillAddressDto | null;
  destinationAddress: WaybillAddressDto | null;
  vehiclePlate: string | null;
  vehicleConfig: string | null;
  vehiclePermitType: string | null;
  vehiclePermitNumber: string | null;
  insuranceCompany: string | null;
  insurancePolicy: string | null;
  driverName: string | null;
  driverRfc: string | null;
  driverLicenseNumber: string | null;
  distanceKm: number | null;
  departureAt: Date;
  arrivalAt: Date | null;
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
  destinationBranchId: string | null;
  destinationCustomerId: string | null;
  destinationCustomerName?: string;
  destinationCustomerCode?: string;
  saleId: string | null;
  type: WaybillType;
  status: WaybillStatus;
  departureAt: Date;
  arrivalAt: Date | null;
  createdAt: Date;
}

export interface WaybillFilters {
  page: number;
  pageSize: number;
  status: WaybillStatus[];
  type: WaybillType[];
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
