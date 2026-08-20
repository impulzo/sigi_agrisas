import type { WaybillType } from "../../domain/entities/Waybill";

export interface WaybillAddressDto {
  street: string;
  exteriorNumber: string;
  interiorNumber: string | null;
  neighborhood: string;
  municipality: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface WaybillItemDto {
  id: string;
  productId: string | null;
  productCodeSnapshot: string | null;
  productNameSnapshot: string;
  satBienesTranspCode: string | null;
  satUnitCode: string | null;
  quantity: number;
  weightKg: number | null;
  isHazardousMaterial: boolean;
  hazardousMaterialCode: string | null;
}

export interface WaybillDto {
  id: string;
  folioCode: string;
  originBranchId: string;
  destinationBranchId: string | null;
  destinationCustomerId: string | null;
  destinationCustomerName?: string;
  destinationCustomerCode?: string;
  saleId: string | null;
  type: WaybillType;
  status: string;
  notes: string | null;
  originAddress: WaybillAddressDto | null;
  destinationAddress: WaybillAddressDto | null;
  vehicleId: string | null;
  driverId: string | null;
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
  departureAt: string;
  arrivalAt: string | null;
  cfdiUuid: string | null;
  facturamaCfdiId: string | null;
  xmlUrl: string | null;
  pdfUrl: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  creatorId: string;
  createdAt: string;
  updatedAt: string;
  items?: WaybillItemDto[];
}

export interface WaybillSummaryDto {
  id: string;
  folioCode: string;
  originBranchId: string;
  destinationBranchId: string | null;
  destinationCustomerId: string | null;
  destinationCustomerName?: string;
  destinationCustomerCode?: string;
  saleId: string | null;
  type: WaybillType;
  status: string;
  departureAt: string;
  arrivalAt: string | null;
  createdAt: string;
}

// --- Request types ---

export interface CreateSimpleWaybillItemRequest {
  productId: string;
  description: string;
  quantity: number;
}

export interface CreateSimpleWaybillRequest {
  type: "simple";
  originBranchId: string;
  destinationBranchId: string;
  transferDate: string;
  notes?: string | null;
  items: CreateSimpleWaybillItemRequest[];
}

export interface CreateCartaPorteWaybillItemRequest {
  productId?: string | null;
  description: string;
  satBienesTranspCode: string;
  satUnitCode: string;
  quantity: number;
  weightKg: number;
  isHazardousMaterial?: boolean;
  hazardousMaterialCode?: string | null;
}

export interface CreateCartaPorteWaybillRequest {
  type: "carta_porte";
  saleId: string;
  vehicle: {
    vehicleId?: string | null;
    plate: string;
    config: string;
    permitType: string;
    permitNumber: string;
    insuranceCompany: string;
    insurancePolicy: string;
  };
  driver: {
    driverId?: string | null;
    name: string;
    rfc?: string | null;
    licenseNumber: string;
  };
  distanceKm: number;
  departureAt: string;
  arrivalAt: string;
  items: CreateCartaPorteWaybillItemRequest[];
}

export type CreateWaybillRequest = CreateSimpleWaybillRequest | CreateCartaPorteWaybillRequest;

export interface CancelWaybillRequest {
  reason: string;
}
