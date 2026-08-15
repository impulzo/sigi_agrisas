export interface InventoryItem {
  id: string;
  branchId: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  reservedQuantity: number;
  reorderPoint: number;
  updatedAt: Date;
  nearestExpirationDate: Date | null;
  nearestExpirationLotNumber: string | null;
  expiryStatus: "ok" | "warning" | "critical" | null;
}
