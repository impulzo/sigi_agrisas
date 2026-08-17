import { Waybill, WaybillAddressSnapshot, WaybillStatus, WaybillType } from "../../domain/entities/Waybill";

export interface WaybillSummary {
  id: string;
  folioCode: string;
  originBranchId: string;
  destinationBranchId: string | null;
  destinationCustomerId: string | null;
  destinationCustomerName: string | null;
  destinationCustomerCode: string | null;
  saleId: string | null;
  type: WaybillType;
  status: WaybillStatus;
  departureAt: Date;
  arrivalAt: Date | null;
  createdAt: Date;
}

export interface ListWaybillsOptions {
  /** Matches EITHER originBranchId OR destinationBranchId. */
  branchId?: string;
  statuses?: WaybillStatus[];
  types?: WaybillType[];
  from?: Date;
  to?: Date;
  page: number;
  pageSize: number;
}

export interface ListWaybillsResult {
  items: WaybillSummary[];
  total: number;
}

export interface CreateWaybillItemData {
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

export interface CreateWaybillBaseData {
  id: string;
  folioId: string;
  originBranchId: string;
  destinationBranchId: string | null;
  departureAt: Date;
  notes: string | null;
  creatorId: string;
  items: CreateWaybillItemData[];
}

export interface CartaPorteWaybillData {
  destinationCustomerId: string;
  saleId: string;
  originAddress: WaybillAddressSnapshot;
  destinationAddress: WaybillAddressSnapshot;
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
  arrivalAt: Date;
}

export type CreateWaybillData =
  | (CreateWaybillBaseData & { type: "simple" })
  | (CreateWaybillBaseData & CartaPorteWaybillData & { type: "carta_porte" });

export interface StampCallbackResult {
  cfdiId: string;
  uuid: string;
  xmlUrl: string | null;
  pdfUrl: string | null;
}

/**
 * Invoked by the repository from inside the same transaction that moves
 * inventory. Throwing rolls back the transaction (no folio consumed, no
 * inventory moved, no row persisted) — the caller (use case) is responsible
 * for building the SAT payload and calling the gateway. Null for `type:
 * "simple"`, which is never stamped.
 */
export type StampCallback = () => Promise<StampCallbackResult>;

/**
 * Invoked by the repository from inside the same transaction that reverses
 * inventory on cancellation. Throwing rolls back the transaction (inventory
 * NOT reversed). Null when the waybill was never stamped (either `type:
 * "simple"`, or a `carta_porte` waybill without a `facturamaCfdiId`).
 */
export type CancelStampCallback = (() => Promise<void>) | null;

export interface WaybillRepository {
  list(options: ListWaybillsOptions): Promise<ListWaybillsResult>;
  findById(id: string): Promise<Waybill | null>;
  /**
   * For `type: "simple"`: validates sufficient stock at origin per line (throws
   * InsufficientStockAtOriginError otherwise) and moves inventory (strict at origin,
   * tolerant at destination). For `type: "carta_porte"`: does NOT touch inventory —
   * the linked sale already decremented origin stock when it completed. In both cases,
   * allocates the folio, invokes `stamp` when non-null, and persists the waybill — all
   * in one transaction.
   */
  createCompleted(data: CreateWaybillData, stamp: StampCallback | null): Promise<Waybill>;
  /**
   * For `type: "simple"`: reverses inventory (tolerant at both sides). For
   * `type: "carta_porte"`: does NOT touch inventory. Invokes `cancelStamp` when the
   * waybill was stamped, and marks the waybill cancelled — all in one transaction.
   */
  markCancelled(
    id: string,
    cancelledBy: string,
    cancellationReason: string,
    cancelStamp: CancelStampCallback
  ): Promise<Waybill>;
}
