import {
  ProductRepository,
  ProductWithDepartment,
  CreateProductData,
  UpdateProductData,
  FindAllProductsOptions,
} from "../../application/ports/ProductRepository";
import { Product } from "../../domain/entities/Product";
import { ProductNotFoundError } from "../../domain/errors/ProductNotFoundError";
import { ProductCodeAlreadyInUseError } from "../../domain/errors/ProductCodeAlreadyInUseError";

let idCounter = 0;

function makeId(): string {
  return `test-product-${++idCounter}`;
}

export class InMemoryProductRepository implements ProductRepository {
  private store: Product[] = [];
  private departmentNames = new Map<string, string>();

  setDepartmentName(departmentId: string, name: string): void {
    this.departmentNames.set(departmentId, name);
  }

  private wrap(product: Product): ProductWithDepartment {
    return { product, departmentName: this.departmentNames.get(product.departmentId) ?? "" };
  }

  async findAll({
    page,
    pageSize,
    includeInactive,
    search,
    departmentId,
  }: FindAllProductsOptions): Promise<{ items: ProductWithDepartment[]; total: number }> {
    let items = includeInactive ? this.store : this.store.filter((p) => p.isActive);

    if (departmentId) {
      items = items.filter((p) => p.departmentId === departmentId);
    }

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
      );
    }

    const total = items.length;
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize).map((p) => this.wrap(p)), total };
  }

  async findById(id: string): Promise<ProductWithDepartment | null> {
    const found = this.store.find((p) => p.id === id);
    return found ? this.wrap(found) : null;
  }

  async create(data: CreateProductData): Promise<ProductWithDepartment> {
    if (this.store.some((p) => p.code === data.code)) {
      throw new ProductCodeAlreadyInUseError(data.code);
    }
    const now = new Date();
    const product = Product.create({
      id: makeId(),
      code: data.code,
      name: data.name,
      unit: data.unit,
      satProductCode: data.satProductCode ?? null,
      departmentId: data.departmentId,
      ivaRate: data.ivaRate ?? null,
      iepsRate: data.iepsRate ?? null,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
    this.store.push(product);
    return this.wrap(product);
  }

  async update(id: string, data: UpdateProductData): Promise<ProductWithDepartment> {
    const idx = this.store.findIndex((p) => p.id === id);
    if (idx === -1) throw new ProductNotFoundError(id);

    const existing = this.store[idx];
    const updated = Product.create({
      id: existing.id,
      code: existing.code,
      name: data.name ?? existing.name,
      unit: data.unit ?? existing.unit,
      satProductCode: "satProductCode" in data ? data.satProductCode ?? null : existing.satProductCode,
      departmentId: data.departmentId ?? existing.departmentId,
      ivaRate: "ivaRate" in data ? data.ivaRate ?? null : existing.ivaRate,
      iepsRate: "iepsRate" in data ? data.iepsRate ?? null : existing.iepsRate,
      isActive: data.isActive ?? existing.isActive,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });
    this.store[idx] = updated;
    return this.wrap(updated);
  }

  async softDelete(id: string): Promise<void> {
    const idx = this.store.findIndex((p) => p.id === id);
    if (idx === -1) throw new ProductNotFoundError(id);
    await this.update(id, { isActive: false });
  }

  reset(): void {
    this.store = [];
    this.departmentNames.clear();
    idCounter = 0;
  }
}
