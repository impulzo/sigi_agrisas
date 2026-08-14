export interface BranchInventoryDto {
  id: string;
  branchId: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  reservedQuantity: number;
  reorderPoint: number;
  updatedAt: string;
  nearestExpirationDate: string | null;
  nearestExpirationLotNumber: string | null;
  expiryStatus: "ok" | "warning" | "critical" | null;
}
