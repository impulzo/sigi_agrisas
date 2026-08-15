export interface NearestExpirationLot {
  expirationDate: Date;
  lotNumber: string;
}

export interface InventoryLotRepository {
  findNearestExpirationByProducts(
    branchId: string,
    productIds: string[]
  ): Promise<Map<string, NearestExpirationLot>>;
}
