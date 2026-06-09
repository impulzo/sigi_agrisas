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
}

export interface ListBranchInventoryResponse {
  items: BranchInventoryDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListBranchInventoryParams {
  branchId: string;
  page: number;
  pageSize: number;
  search?: string;
  belowReorder?: boolean;
}

export interface AssignProductBody {
  productId: string;
  quantity?: number;
  reservedQuantity?: number;
  reorderPoint?: number;
}

export interface UpdateInventoryBody {
  quantity?: number;
  reservedQuantity?: number;
  reorderPoint?: number;
}

export interface AdjustStockBody {
  delta: number;
  reason?: string;
}
