import {
  BranchInventoryRepository,
  BranchInventoryView,
  CreateBranchInventoryData,
  UpdateBranchInventoryData,
  FindAllBranchInventoryOptions,
} from "../../application/ports/BranchInventoryRepository";
import { BranchInventory } from "../../domain/entities/BranchInventory";
import { BranchInventoryRecordNotFoundError } from "../../domain/errors/BranchInventoryRecordNotFoundError";
import { BranchInventoryAlreadyExistsError } from "../../domain/errors/BranchInventoryAlreadyExistsError";
import { NegativeStockNotAllowedError } from "../../domain/errors/NegativeStockNotAllowedError";

let idCounter = 0;

function makeId(): string {
  return `test-inventory-${++idCounter}`;
}

export class InMemoryBranchInventoryRepository implements BranchInventoryRepository {
  private store: BranchInventory[] = [];
  private productInfo = new Map<string, { code: string; name: string }>();

  setProductInfo(productId: string, code: string, name: string): void {
    this.productInfo.set(productId, { code, name });
  }

  private wrap(inventory: BranchInventory): BranchInventoryView {
    const info = this.productInfo.get(inventory.productId) ?? { code: "", name: "" };
    return { inventory, productCode: info.code, productName: info.name };
  }

  async findAll({
    branchId,
    page,
    pageSize,
    search,
    belowReorder,
  }: FindAllBranchInventoryOptions): Promise<{ items: BranchInventoryView[]; total: number }> {
    let items = this.store.filter((i) => i.branchId === branchId).map((i) => this.wrap(i));

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (v) => v.productCode.toLowerCase().includes(q) || v.productName.toLowerCase().includes(q)
      );
    }
    if (belowReorder) {
      items = items.filter((v) => v.inventory.quantity < v.inventory.reorderPoint);
    }

    items.sort((a, b) => a.productName.localeCompare(b.productName));

    const total = items.length;
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total };
  }

  async findByBranchAndProduct(branchId: string, productId: string): Promise<BranchInventoryView | null> {
    const found = this.store.find((i) => i.branchId === branchId && i.productId === productId);
    return found ? this.wrap(found) : null;
  }

  async create(data: CreateBranchInventoryData): Promise<BranchInventoryView> {
    if (this.store.some((i) => i.branchId === data.branchId && i.productId === data.productId)) {
      throw new BranchInventoryAlreadyExistsError();
    }
    const inventory = BranchInventory.create({
      id: makeId(),
      branchId: data.branchId,
      productId: data.productId,
      quantity: data.quantity ?? 0,
      reservedQuantity: data.reservedQuantity ?? 0,
      reorderPoint: data.reorderPoint ?? 0,
      updatedAt: new Date(),
    });
    this.store.push(inventory);
    return this.wrap(inventory);
  }

  async update(id: string, data: UpdateBranchInventoryData): Promise<BranchInventoryView> {
    const idx = this.store.findIndex((i) => i.id === id);
    if (idx === -1) throw new BranchInventoryRecordNotFoundError();
    const existing = this.store[idx];
    const updated = BranchInventory.create({
      id: existing.id,
      branchId: existing.branchId,
      productId: existing.productId,
      quantity: data.quantity ?? existing.quantity,
      reservedQuantity: data.reservedQuantity ?? existing.reservedQuantity,
      reorderPoint: data.reorderPoint ?? existing.reorderPoint,
      updatedAt: new Date(),
    });
    this.store[idx] = updated;
    return this.wrap(updated);
  }

  async adjust(id: string, delta: number): Promise<BranchInventoryView> {
    const idx = this.store.findIndex((i) => i.id === id);
    if (idx === -1) throw new BranchInventoryRecordNotFoundError();
    const existing = this.store[idx];
    const next = existing.quantity + delta;
    if (next < 0) throw new NegativeStockNotAllowedError();
    const updated = BranchInventory.create({
      id: existing.id,
      branchId: existing.branchId,
      productId: existing.productId,
      quantity: next,
      reservedQuantity: existing.reservedQuantity,
      reorderPoint: existing.reorderPoint,
      updatedAt: new Date(),
    });
    this.store[idx] = updated;
    return this.wrap(updated);
  }

  async delete(id: string): Promise<void> {
    const idx = this.store.findIndex((i) => i.id === id);
    if (idx === -1) throw new BranchInventoryRecordNotFoundError();
    this.store.splice(idx, 1);
  }

  reset(): void {
    this.store = [];
    this.productInfo.clear();
    idCounter = 0;
  }
}
