import { InventoryMovement } from "../../domain/entities/InventoryMovement";
import { BranchBalanceSummary } from "../../domain/services/KardexAssembler";

export interface RebuildInventoryArticleResult {
  movementsRebuilt: number;
  previousQuantity: number;
  newQuantity: number;
}

export interface InventoryMovementRepository {
  /** Movements within [from, to], filtered to `branchId` when set (null = every branch in scope). */
  findMovementsInRange(
    productId: string,
    branchId: string | null,
    from: Date,
    to: Date
  ): Promise<InventoryMovement[]>;

  /**
   * One entry per branch in scope (a single entry when `branchId` is set) carrying the
   * balance right before `from`, the last balance within [from, to] (or null if no
   * movements fall in range), and the current `branch_inventory.quantity`.
   */
  getBranchBalances(
    productId: string,
    branchId: string | null,
    from: Date,
    to: Date
  ): Promise<BranchBalanceSummary[]>;

  /**
   * Rereads every movement for (productId, branchId) in chronological order, recomputes
   * `balanceAfter` from 0, persists the recalculated rows, and syncs
   * `branch_inventory.quantity` to the final balance — all in one transaction.
   */
  rebuild(productId: string, branchId: string): Promise<RebuildInventoryArticleResult>;
}
