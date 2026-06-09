export interface CreateBranchInventoryRequest {
  productId: string;
  quantity?: number;
  reservedQuantity?: number;
  reorderPoint?: number;
}
