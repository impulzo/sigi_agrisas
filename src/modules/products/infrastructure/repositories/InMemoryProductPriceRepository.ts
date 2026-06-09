import {
  ProductPriceRepository,
  CreateProductPriceData,
  UpdateProductPriceData,
} from "../../application/ports/ProductPriceRepository";
import { ProductPrice } from "../../domain/entities/ProductPrice";
import { ProductPriceNotFoundError } from "../../domain/errors/ProductPriceNotFoundError";
import { DuplicatePriceNameError } from "../../domain/errors/DuplicatePriceNameError";
import { DuplicateDefaultPriceError } from "../../domain/errors/DuplicateDefaultPriceError";

let idCounter = 0;

function makeId(): string {
  return `test-price-${++idCounter}`;
}

export class InMemoryProductPriceRepository implements ProductPriceRepository {
  private store: ProductPrice[] = [];

  async findByProductId(productId: string): Promise<ProductPrice[]> {
    return this.store
      .filter((p) => p.productId === productId)
      .sort((a, b) => {
        if (a.isDefault !== b.isDefault) return a.isDefault ? -1 : 1;
        if (a.minQuantity !== b.minQuantity) return a.minQuantity - b.minQuantity;
        return a.name.localeCompare(b.name);
      });
  }

  async findById(id: string): Promise<ProductPrice | null> {
    return this.store.find((p) => p.id === id) ?? null;
  }

  async findDefaultByProductId(productId: string): Promise<ProductPrice | null> {
    return this.store.find((p) => p.productId === productId && p.isDefault) ?? null;
  }

  async create(data: CreateProductPriceData): Promise<ProductPrice> {
    if (this.store.some((p) => p.productId === data.productId && p.name === data.name)) {
      throw new DuplicatePriceNameError(data.name);
    }
    if (data.isDefault && this.store.some((p) => p.productId === data.productId && p.isDefault)) {
      throw new DuplicateDefaultPriceError();
    }
    const now = new Date();
    const price = ProductPrice.create({
      id: makeId(),
      productId: data.productId,
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
      this.store.some((p, i) => i !== idx && p.productId === existing.productId && p.name === data.name)
    ) {
      throw new DuplicatePriceNameError(data.name);
    }
    if (
      data.isDefault === true &&
      this.store.some((p, i) => i !== idx && p.productId === existing.productId && p.isDefault)
    ) {
      throw new DuplicateDefaultPriceError();
    }

    const updated = ProductPrice.create({
      id: existing.id,
      productId: existing.productId,
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

  async unsetDefaultForProduct(productId: string, exceptId?: string): Promise<void> {
    this.store = this.store.map((p) =>
      p.productId === productId && p.isDefault && p.id !== exceptId
        ? ProductPrice.create({ ...p, isDefault: false, updatedAt: new Date() })
        : p
    );
  }

  async unsetDefaultAndUpdate(productId: string, priceId: string, data: UpdateProductPriceData): Promise<ProductPrice> {
    await this.unsetDefaultForProduct(productId, priceId);
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
