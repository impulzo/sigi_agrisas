import { WaybillItem } from "./WaybillItem";
import type { WaybillType } from "../value-objects/WaybillType";

export type { WaybillType } from "../value-objects/WaybillType";
export type WaybillStatus = "completed" | "cancelled";

export interface WaybillAddressSnapshot {
  street: string;
  exteriorNumber: string;
  interiorNumber: string | null;
  neighborhood: string;
  municipality: string;
  state: string;
  country: string;
  zipCode: string;
}

export interface WaybillProps {
  id: string;
  folioId: string;
  folioNumber: number;
  folioCode: string;
  originBranchId: string;
  destinationBranchId: string | null;
  destinationCustomerId: string | null;
  /** Denormalized for read convenience — populated by the repository when `destinationCustomerId` is set. */
  destinationCustomerName: string | null;
  destinationCustomerCode: string | null;
  saleId: string | null;
  type: WaybillType;
  status: WaybillStatus;
  notes: string | null;
  originAddress: WaybillAddressSnapshot | null;
  destinationAddress: WaybillAddressSnapshot | null;
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
  items: WaybillItem[];
}

export class Waybill {
  readonly id!: string;
  readonly folioId!: string;
  readonly folioNumber!: number;
  readonly folioCode!: string;
  readonly originBranchId!: string;
  readonly destinationBranchId!: string | null;
  readonly destinationCustomerId!: string | null;
  readonly destinationCustomerName!: string | null;
  readonly destinationCustomerCode!: string | null;
  readonly saleId!: string | null;
  readonly type!: WaybillType;
  readonly status!: WaybillStatus;
  readonly notes!: string | null;
  readonly originAddress!: WaybillAddressSnapshot | null;
  readonly destinationAddress!: WaybillAddressSnapshot | null;
  readonly vehicleId!: string | null;
  readonly driverId!: string | null;
  readonly vehiclePlate!: string | null;
  readonly vehicleConfig!: string | null;
  readonly vehiclePermitType!: string | null;
  readonly vehiclePermitNumber!: string | null;
  readonly insuranceCompany!: string | null;
  readonly insurancePolicy!: string | null;
  readonly driverName!: string | null;
  readonly driverRfc!: string | null;
  readonly driverLicenseNumber!: string | null;
  readonly distanceKm!: number | null;
  readonly departureAt!: Date;
  readonly arrivalAt!: Date | null;
  readonly cfdiUuid!: string | null;
  readonly facturamaCfdiId!: string | null;
  readonly xmlUrl!: string | null;
  readonly pdfUrl!: string | null;
  readonly cancelledAt!: Date | null;
  readonly cancelledBy!: string | null;
  readonly cancellationReason!: string | null;
  readonly creatorId!: string;
  readonly createdAt!: Date;
  readonly updatedAt!: Date;
  readonly items!: WaybillItem[];

  private constructor(props: WaybillProps) {
    Object.assign(this, props);
  }

  static create(props: WaybillProps): Waybill {
    return new Waybill(props);
  }

  isCompleted(): boolean {
    return this.status === "completed";
  }

  isCancelled(): boolean {
    return this.status === "cancelled";
  }

  isCartaPorte(): boolean {
    return this.type === "carta_porte";
  }

  isSimple(): boolean {
    return this.type === "simple";
  }

  matchesBranch(branchId: string): boolean {
    return this.originBranchId === branchId || this.destinationBranchId === branchId;
  }
}
