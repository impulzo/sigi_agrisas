import { InventoryMovement, InventoryMovementProps } from "../../domain/entities/InventoryMovement";
import {
  InventoryMovementRepository,
  RebuildInventoryArticleResult,
} from "../../application/ports/InventoryMovementRepository";
import { BranchBalanceSummary } from "../../domain/services/KardexAssembler";

export class InMemoryInventoryMovementRepository implements InventoryMovementRepository {
  private movements: InventoryMovement[] = [];
  private currentQuantities = new Map<string, number>();

  private key(branchId: string, productId: string): string {
    return `${branchId}:${productId}`;
  }

  seed(movement: InventoryMovement): void {
    this.movements.push(movement);
  }

  setCurrentQuantity(branchId: string, productId: string, quantity: number): void {
    this.currentQuantities.set(this.key(branchId, productId), quantity);
  }

  private branchesInScope(productId: string, branchId: string | null): string[] {
    if (branchId) return [branchId];
    const set = new Set<string>();
    for (const m of this.movements) if (m.productId === productId) set.add(m.branchId);
    for (const k of this.currentQuantities.keys()) {
      const [b, p] = k.split(":");
      if (p === productId) set.add(b);
    }
    return [...set];
  }

  private sortedFor(productId: string, branchId: string): InventoryMovement[] {
    return this.movements
      .filter((m) => m.productId === productId && m.branchId === branchId)
      .sort((a, b) => a.movementAt.getTime() - b.movementAt.getTime() || a.sequence - b.sequence);
  }

  async findMovementsInRange(
    productId: string,
    branchId: string | null,
    from: Date,
    to: Date
  ): Promise<InventoryMovement[]> {
    return this.movements.filter(
      (m) =>
        m.productId === productId &&
        (branchId ? m.branchId === branchId : true) &&
        m.movementAt >= from &&
        m.movementAt <= to
    );
  }

  async getBranchBalances(
    productId: string,
    branchId: string | null,
    from: Date,
    to: Date
  ): Promise<BranchBalanceSummary[]> {
    const branches = this.branchesInScope(productId, branchId);
    return branches.map((b) => {
      const relevant = this.sortedFor(productId, b);
      const before = relevant.filter((m) => m.movementAt < from);
      const inRange = relevant.filter((m) => m.movementAt >= from && m.movementAt <= to);

      return {
        branchId: b,
        balanceBeforeRange: before.length > 0 ? before[before.length - 1].balanceAfter : 0,
        lastBalanceInRange: inRange.length > 0 ? inRange[inRange.length - 1].balanceAfter : null,
        currentQuantity: this.currentQuantities.get(this.key(b, productId)) ?? 0,
      };
    });
  }

  async rebuild(productId: string, branchId: string): Promise<RebuildInventoryArticleResult> {
    const relevant = this.sortedFor(productId, branchId);
    const previousQuantity = this.currentQuantities.get(this.key(branchId, productId)) ?? 0;

    let running = 0;
    for (const m of relevant) {
      running += m.direction === "IN" ? m.quantity : -m.quantity;
      const idx = this.movements.indexOf(m);
      this.movements[idx] = InventoryMovement.create({
        ...(m as unknown as InventoryMovementProps),
        balanceAfter: running,
      });
    }

    this.currentQuantities.set(this.key(branchId, productId), running);

    return { movementsRebuilt: relevant.length, previousQuantity, newQuantity: running };
  }

  reset(): void {
    this.movements = [];
    this.currentQuantities.clear();
  }
}
