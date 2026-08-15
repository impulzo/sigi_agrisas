import { InventoryLotRepository, NearestExpirationLot } from "../../application/ports/InventoryLotRepository";

interface LotSeed {
  branchId: string;
  productId: string;
  lotNumber: string;
  expirationDate: Date;
}

export class InMemoryInventoryLotRepository implements InventoryLotRepository {
  private lots: LotSeed[] = [];

  reset(): void {
    this.lots = [];
  }

  seedLot(lot: LotSeed): void {
    this.lots.push(lot);
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
}
