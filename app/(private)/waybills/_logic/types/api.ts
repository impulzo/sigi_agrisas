export type WaybillStatus = "completed" | "cancelled";

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
  satBienesTranspCode: string;
  satUnitCode: string;
  quantity: number;
  weightKg: number;
  isHazardousMaterial: boolean;
  hazardousMaterialCode: string | null;
}

export interface WaybillDto {
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
  departureAt: string;
  arrivalAt: string;
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
  destinationBranchId: string;
  status: WaybillStatus;
  departureAt: string;
  arrivalAt: string;
  createdAt: string;
}

// --- Request types ---

export interface CreateWaybillItemRequest {
  productId?: string | null;
  description: string;
  satBienesTranspCode: string;
  satUnitCode: string;
  quantity: number;
  weightKg: number;
  isHazardousMaterial?: boolean;
  hazardousMaterialCode?: string | null;
}

export interface CreateWaybillRequest {
  originBranchId: string;
  destinationBranchId: string;
  vehicle: {
    plate: string;
    config: string;
    permitType: string;
    permitNumber: string;
    insuranceCompany: string;
    insurancePolicy: string;
  };
  driver: {
    name: string;
    rfc?: string | null;
    licenseNumber: string;
  };
  distanceKm: number;
  departureAt: string;
  arrivalAt: string;
  items: CreateWaybillItemRequest[];
}

export interface CancelWaybillRequest {
  reason: string;
}

export interface ListWaybillsRequest {
  page?: number;
  pageSize?: number;
  status?: WaybillStatus | WaybillStatus[];
  branchId?: string;
  from?: string;
  to?: string;
}

export interface WaybillListResponse {
  items: WaybillSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
}
