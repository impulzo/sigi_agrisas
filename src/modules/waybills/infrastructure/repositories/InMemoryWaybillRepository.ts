import {
  WaybillRepository,
  ListWaybillsOptions,
  ListWaybillsResult,
  CreateWaybillData,
  StampCallback,
  CancelStampCallback,
} from "../../application/ports/WaybillRepository";
import { Waybill, WaybillStatus } from "../../domain/entities/Waybill";
import { WaybillItem } from "../../domain/entities/WaybillItem";
import { InsufficientStockAtOriginError } from "../../domain/errors";

/**
 * In-memory WaybillRepository for unit tests. No real transactions —
 * inventory side effects are tracked in a plain Map for assertion purposes,
 * and stamp callback failures roll back nothing they haven't already
 * committed to the map (mirroring the Prisma repository's atomicity via
 * throw-before-any-mutation ordering). Tests that need real transaction
 * semantics should use the integration suite.
 */
export class InMemoryWaybillRepository implements WaybillRepository {
  private waybills: Map<string, Waybill> = new Map();
  /** inventory[branchId:productId] = quantity */
  readonly inventory: Map<string, number> = new Map();

  private key(branchId: string, productId: string): string {
    return `${branchId}:${productId}`;
  }

  setStock(branchId: string, productId: string, quantity: number): void {
    this.inventory.set(this.key(branchId, productId), quantity);
  }

  getStock(branchId: string, productId: string): number {
    return this.inventory.get(this.key(branchId, productId)) ?? 0;
  }

  async list(options: ListWaybillsOptions): Promise<ListWaybillsResult> {
    let results = Array.from(this.waybills.values());

    if (options.branchId) {
      results = results.filter((w) => w.matchesBranch(options.branchId!));
    }
    if (options.statuses?.length) {
      results = results.filter((w) => options.statuses!.includes(w.status));
    }
    if (options.from) results = results.filter((w) => w.createdAt >= options.from!);
    if (options.to) results = results.filter((w) => w.createdAt <= options.to!);

    results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    const total = results.length;
    const start = (options.page - 1) * options.pageSize;
    const page = results.slice(start, start + options.pageSize);

    return {
      items: page.map((w) => ({
        id: w.id,
        folioCode: w.folioCode,
        originBranchId: w.originBranchId,
        destinationBranchId: w.destinationBranchId,
        destinationCustomerId: w.destinationCustomerId,
        destinationCustomerName: w.destinationCustomerName,
        destinationCustomerCode: w.destinationCustomerCode,
        saleId: w.saleId,
        type: w.type,
        status: w.status,
        departureAt: w.departureAt,
        arrivalAt: w.arrivalAt,
        createdAt: w.createdAt,
      })),
      total,
    };
  }

  async findById(id: string): Promise<Waybill | null> {
    return this.waybills.get(id) ?? null;
  }

  async createCompleted(data: CreateWaybillData, stamp: StampCallback | null): Promise<Waybill> {
    const itemsWithProduct = data.items.filter((i) => i.productId !== null);

    // Strict check at origin BEFORE any mutation (mirrors the atomic UPDATE ... WHERE >= 0
    // pattern). Only for type='simple' — carta_porte never touches inventory (design.md D5).
    if (data.type === "simple") {
      for (const item of itemsWithProduct) {
        const key = this.key(data.originBranchId, item.productId!);
        const current = this.inventory.get(key) ?? 0;
        if (current - item.quantity < 0) {
          throw new InsufficientStockAtOriginError(item.productId!);
        }
      }
    }

    const stampResult = stamp ? await stamp() : null;

    // type='simple' moves inventory; type='carta_porte' does not (see design.md D5).
    if (data.type === "simple") {
      for (const item of itemsWithProduct) {
        const originKey = this.key(data.originBranchId, item.productId!);
        this.inventory.set(originKey, (this.inventory.get(originKey) ?? 0) - item.quantity);
        const destKey = this.key(data.destinationBranchId!, item.productId!);
        this.inventory.set(destKey, (this.inventory.get(destKey) ?? 0) + item.quantity);
      }
    }

    const now = new Date();
    const waybill = Waybill.create({
      id: data.id,
      folioId: data.folioId,
      folioNumber: this.waybills.size + 1,
      folioCode: `${data.type === "simple" ? "TRI" : "TS"}-${String(this.waybills.size + 1).padStart(6, "0")}`,
      originBranchId: data.originBranchId,
      destinationBranchId: data.destinationBranchId,
      destinationCustomerId: data.type === "carta_porte" ? data.destinationCustomerId : null,
      destinationCustomerName: null,
      destinationCustomerCode: null,
      saleId: data.type === "carta_porte" ? data.saleId : null,
      type: data.type,
      status: "completed",
      notes: data.notes,
      originAddress: data.type === "carta_porte" ? data.originAddress : null,
      destinationAddress: data.type === "carta_porte" ? data.destinationAddress : null,
      vehiclePlate: data.type === "carta_porte" ? data.vehiclePlate : null,
      vehicleConfig: data.type === "carta_porte" ? data.vehicleConfig : null,
      vehiclePermitType: data.type === "carta_porte" ? data.vehiclePermitType : null,
      vehiclePermitNumber: data.type === "carta_porte" ? data.vehiclePermitNumber : null,
      insuranceCompany: data.type === "carta_porte" ? data.insuranceCompany : null,
      insurancePolicy: data.type === "carta_porte" ? data.insurancePolicy : null,
      driverName: data.type === "carta_porte" ? data.driverName : null,
      driverRfc: data.type === "carta_porte" ? data.driverRfc : null,
      driverLicenseNumber: data.type === "carta_porte" ? data.driverLicenseNumber : null,
      distanceKm: data.type === "carta_porte" ? data.distanceKm : null,
      departureAt: data.departureAt,
      arrivalAt: data.type === "carta_porte" ? data.arrivalAt : null,
      cfdiUuid: stampResult?.uuid ?? null,
      facturamaCfdiId: stampResult?.cfdiId ?? null,
      xmlUrl: stampResult?.xmlUrl ?? null,
      pdfUrl: stampResult?.pdfUrl ?? null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      creatorId: data.creatorId,
      createdAt: now,
      updatedAt: now,
      items: data.items.map((item) =>
        WaybillItem.create({
          id: item.id,
          waybillId: data.id,
          productId: item.productId,
          productCodeSnapshot: item.productCodeSnapshot,
          productNameSnapshot: item.productNameSnapshot,
          satBienesTranspCode: item.satBienesTranspCode,
          satUnitCode: item.satUnitCode,
          quantity: item.quantity,
          weightKg: item.weightKg,
          isHazardousMaterial: item.isHazardousMaterial,
          hazardousMaterialCode: item.hazardousMaterialCode,
        })
      ),
    });

    this.waybills.set(waybill.id, waybill);
    return waybill;
  }

  async markCancelled(
    id: string,
    cancelledBy: string,
    cancellationReason: string,
    cancelStamp: CancelStampCallback
  ): Promise<Waybill> {
    const existing = this.waybills.get(id);
    if (!existing) throw new Error(`Waybill not found: ${id}`);

    if (cancelStamp) {
      await cancelStamp();
    }

    // type='simple' reverses inventory; type='carta_porte' never moved it (design.md D5).
    if (existing.type === "simple") {
      for (const item of existing.items) {
        if (!item.productId) continue;
        const originKey = this.key(existing.originBranchId, item.productId);
        this.inventory.set(originKey, (this.inventory.get(originKey) ?? 0) + item.quantity);
        const destKey = this.key(existing.destinationBranchId!, item.productId);
        this.inventory.set(destKey, (this.inventory.get(destKey) ?? 0) - item.quantity);
      }
    }

    const updated = Waybill.create({
      ...existing,
      status: "cancelled" as WaybillStatus,
      cancelledAt: new Date(),
      cancelledBy,
      cancellationReason,
      updatedAt: new Date(),
    });

    this.waybills.set(id, updated);
    return updated;
  }
}
