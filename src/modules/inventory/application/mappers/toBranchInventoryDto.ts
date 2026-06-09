import { BranchInventoryView } from "../ports/BranchInventoryRepository";
import { BranchInventoryDto } from "../dto/BranchInventoryDto";

export function toBranchInventoryDto({ inventory, productCode, productName }: BranchInventoryView): BranchInventoryDto {
  return {
    id: inventory.id,
    branchId: inventory.branchId,
    productId: inventory.productId,
    productCode,
    productName,
    quantity: inventory.quantity,
    reservedQuantity: inventory.reservedQuantity,
    reorderPoint: inventory.reorderPoint,
    updatedAt: inventory.updatedAt.toISOString(),
  };
}
