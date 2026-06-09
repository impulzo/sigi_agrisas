import { BranchInventory } from "../../domain/entities/BranchInventory";

export interface BranchInventoryView {
  inventory: BranchInventory;
  productCode: string;
  productName: string;
}

export interface FindAllBranchInventoryOptions {
  branchId: string;
  page: number;
  pageSize: number;
  search?: string;
  belowReorder?: boolean;
}

export interface CreateBranchInventoryData {
  branchId: string;
  productId: string;
  quantity?: number;
  reservedQuantity?: number;
  reorderPoint?: number;
}

export interface UpdateBranchInventoryData {
  quantity?: number;
  reservedQuantity?: number;
  reorderPoint?: number;
}

export interface BranchInventoryRepository {
  findAll(opts: FindAllBranchInventoryOptions): Promise<{ items: BranchInventoryView[]; total: number }>;
  findByBranchAndProduct(branchId: string, productId: string): Promise<BranchInventoryView | null>;
  create(data: CreateBranchInventoryData): Promise<BranchInventoryView>;
  update(id: string, data: UpdateBranchInventoryData): Promise<BranchInventoryView>;
  /** Atomically adds `delta` to quantity, rejecting if the result would be negative. */
  adjust(id: string, delta: number): Promise<BranchInventoryView>;
  delete(id: string): Promise<void>;
}
