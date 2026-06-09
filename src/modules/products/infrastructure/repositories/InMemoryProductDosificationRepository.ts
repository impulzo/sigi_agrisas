import {
  ProductDosificationRepository,
  CreateProductDosificationData,
  UpdateProductDosificationData,
} from "../../application/ports/ProductDosificationRepository";
import { ProductDosification } from "../../domain/entities/ProductDosification";
import { ProductDosificationNotFoundError } from "../../domain/errors/ProductDosificationNotFoundError";
import { DuplicateDosificationNameError } from "../../domain/errors/DuplicateDosificationNameError";

let idCounter = 0;

function makeId(): string {
  return `test-dosification-${++idCounter}`;
}

export class InMemoryProductDosificationRepository implements ProductDosificationRepository {
  private store: ProductDosification[] = [];

  async findByProductId(productId: string): Promise<ProductDosification[]> {
    return this.store
      .filter((d) => d.productId === productId)
      .sort((a, b) => (a.numParts !== b.numParts ? a.numParts - b.numParts : a.name.localeCompare(b.name)));
  }

  async findById(id: string): Promise<ProductDosification | null> {
    return this.store.find((d) => d.id === id) ?? null;
  }

  async create(data: CreateProductDosificationData): Promise<ProductDosification> {
    if (this.store.some((d) => d.productId === data.productId && d.name === data.name)) {
      throw new DuplicateDosificationNameError(data.name);
    }
    const now = new Date();
    const dosification = ProductDosification.create({
      id: makeId(),
      productId: data.productId,
      name: data.name,
      numParts: data.numParts,
      isActive: data.isActive,
      createdAt: now,
      updatedAt: now,
    });
    this.store.push(dosification);
    return dosification;
  }

  async update(id: string, data: UpdateProductDosificationData): Promise<ProductDosification> {
    const idx = this.store.findIndex((d) => d.id === id);
    if (idx === -1) throw new ProductDosificationNotFoundError(id);
    const existing = this.store[idx];

    if (
      data.name !== undefined &&
      data.name !== existing.name &&
      this.store.some((d, i) => i !== idx && d.productId === existing.productId && d.name === data.name)
    ) {
      throw new DuplicateDosificationNameError(data.name);
    }

    const updated = ProductDosification.create({
      id: existing.id,
      productId: existing.productId,
      name: data.name ?? existing.name,
      numParts: data.numParts ?? existing.numParts,
      isActive: data.isActive ?? existing.isActive,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });
    this.store[idx] = updated;
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const idx = this.store.findIndex((d) => d.id === id);
    if (idx === -1) throw new ProductDosificationNotFoundError(id);
    await this.update(id, { isActive: false });
  }

  reset(): void {
    this.store = [];
    idCounter = 0;
  }
}
