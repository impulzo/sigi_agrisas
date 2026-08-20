import { InventoryLotRepository, NearestExpirationLot } from "../../application/ports/InventoryLotRepository";
import type {
  ExpiryNotificationThreshold,
  InventoryLotExpirySnapshot,
} from "../../domain/services/InventoryLotExpiryNotificationPolicy";

interface LotSeed {
  branchId: string;
  productId: string;
  lotNumber: string;
  expirationDate: Date;
}

export class InMemoryInventoryLotRepository implements InventoryLotRepository {
  private lots: LotSeed[] = [];
  private expirySnapshots: InventoryLotExpirySnapshot[] = [];

  reset(): void {
    this.lots = [];
    this.expirySnapshots = [];
  }

  seedLot(lot: LotSeed): void {
    this.lots.push(lot);
  }

  seedExpirySnapshot(lot: InventoryLotExpirySnapshot): void {
    this.expirySnapshots.push(lot);
  }

  async findNearestExpirationByProducts(
    branchId: string,
    productIds: string[]
  ): Promise<Map<string, NearestExpirationLot>> {
    const result = new Map<string, NearestExpirationLot>();
    for (const productId of productIds) {
      const candidates = this.lots
        .filter((lot) => lot.branchId === branchId && lot.productId === productId)
        .sort((a, b) => a.expirationDate.getTime() - b.expirationDate.getTime());
      if (candidates.length > 0) {
        result.set(productId, { expirationDate: candidates[0].expirationDate, lotNumber: candidates[0].lotNumber });
      }
    }
    return result;
  }

  async findPendingExpiryNotificationLots(): Promise<InventoryLotExpirySnapshot[]> {
    return this.expirySnapshots.filter((lot) => lot.notifiedDayOfAt === null);
  }

  async markLotNotified(lotId: string, threshold: ExpiryNotificationThreshold): Promise<void> {
    const lot = this.expirySnapshots.find((l) => l.id === lotId);
    if (!lot) return;
    const now = new Date();
    if (threshold === "sixMonths") lot.notifiedSixMonthsAt = now;
    if (threshold === "threeMonths") lot.notifiedThreeMonthsAt = now;
    if (threshold === "dayOf") lot.notifiedDayOfAt = now;
  }
}
