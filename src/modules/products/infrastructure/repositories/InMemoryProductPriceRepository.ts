import {
  ProductPriceRepository,
  CreateProductPriceData,
  UpdateProductPriceData,
} from "../../application/ports/ProductPriceRepository";
import { ProductPrice } from "../../domain/entities/ProductPrice";
import { sortProductPricesForDisplay } from "../../domain/services/sortProductPricesForDisplay";
import { resolveEffectivePrices } from "../../domain/services/resolveEffectivePrices";
import { ProductPriceNotFoundError } from "../../domain/errors/ProductPriceNotFoundError";
import { DuplicatePriceNameError } from "../../domain/errors/DuplicatePriceNameError";
import { DuplicateDefaultPriceError } from "../../domain/errors/DuplicateDefaultPriceError";

let idCounter = 0;

function makeId(): string {
  return `test-price-${++idCounter}`;
}

/** Trata `branchId` como su propio bucket: `null` (base) nunca colisiona con un branchId específico. */
function sameBucket(a: string | null, b: string | null): boolean {
  return a === b;
}

export class InMemoryProductPriceRepository implements ProductPriceRepository {
  private store: ProductPrice[] = [];

  async findByProductId(productId: string): Promise<ProductPrice[]> {
    return sortProductPricesForDisplay(
      this.store.filter((p) => p.productId === productId && p.branchId === null)
    );
  }

  async findEffectiveForBranch(productId: string, branchId: string): Promise<ProductPrice[]> {
    const rows = this.store.filter(
      (p) => p.productId === productId && (p.branchId === null || p.branchId === branchId)
    );
    return sortProductPricesForDisplay(resolveEffectivePrices(rows, branchId));
  }

  async findById(id: string): Promise<ProductPrice | null> {
    return this.store.find((p) => p.id === id) ?? null;
  }

  async findDefaultByProductId(productId: string, branchId?: string | null): Promise<ProductPrice | null> {
    const scope = branchId ?? null;
    return this.store.find((p) => p.productId === productId && sameBucket(p.branchId, scope) && p.isDefault) ?? null;
  }

  async create(data: CreateProductPriceData): Promise<ProductPrice> {
    const scope = data.branchId ?? null;
    if (this.store.some((p) => p.productId === data.productId && sameBucket(p.branchId, scope) && p.name === data.name)) {
      throw new DuplicatePriceNameError(data.name);
    }
    if (
      data.isDefault &&
      this.store.some((p) => p.productId === data.productId && sameBucket(p.branchId, scope) && p.isDefault)
    ) {
      throw new DuplicateDefaultPriceError();
    }
    const now = new Date();
    const price = ProductPrice.create({
      id: makeId(),
      productId: data.productId,
      branchId: scope,
      name: data.name,
      price: data.price,
      minQuantity: data.minQuantity,
      discountPct: data.discountPct ?? null,
      isDefault: data.isDefault,
      createdAt: now,
      updatedAt: now,
    });
    this.store.push(price);
    return price;
  }

  async update(id: string, data: UpdateProductPriceData): Promise<ProductPrice> {
    const idx = this.store.findIndex((p) => p.id === id);
    if (idx === -1) throw new ProductPriceNotFoundError(id);
    const existing = this.store[idx];

    if (
      data.name !== undefined &&
      data.name !== existing.name &&
      this.store.some(
        (p, i) => i !== idx && p.productId === existing.productId && sameBucket(p.branchId, existing.branchId) && p.name === data.name
      )
    ) {
      throw new DuplicatePriceNameError(data.name);
    }
    if (
      data.isDefault === true &&
      this.store.some(
        (p, i) => i !== idx && p.productId === existing.productId && sameBucket(p.branchId, existing.branchId) && p.isDefault
      )
    ) {
      throw new DuplicateDefaultPriceError();
    }

    const updated = ProductPrice.create({
      id: existing.id,
      productId: existing.productId,
      branchId: existing.branchId,
      name: data.name ?? existing.name,
      price: data.price ?? existing.price,
      minQuantity: data.minQuantity ?? existing.minQuantity,
      discountPct: "discountPct" in data ? data.discountPct ?? null : existing.discountPct,
      isDefault: data.isDefault ?? existing.isDefault,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });
    this.store[idx] = updated;
    return updated;
  }

  async unsetDefaultForProduct(productId: string, branchId: string | null, exceptId?: string): Promise<void> {
    this.store = this.store.map((p) =>
      p.productId === productId && sameBucket(p.branchId, branchId) && p.isDefault && p.id !== exceptId
        ? ProductPrice.create({ ...p, isDefault: false, updatedAt: new Date() })
        : p
    );
  }

  async unsetDefaultAndUpdate(
    productId: string,
    branchId: string | null,
    priceId: string,
    data: UpdateProductPriceData
  ): Promise<ProductPrice> {
    await this.unsetDefaultForProduct(productId, branchId, priceId);
    return this.update(priceId, data);
  }

  async delete(id: string): Promise<void> {
    const idx = this.store.findIndex((p) => p.id === id);
    if (idx === -1) throw new ProductPriceNotFoundError(id);
    this.store.splice(idx, 1);
  }

  reset(): void {
    this.store = [];
    idCounter = 0;
  }
}
