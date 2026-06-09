import { randomUUID } from "crypto";
import { BranchRepository, FindAllBranchesOptions, CreateBranchData, UpdateBranchData } from "@/modules/branches/application/ports/BranchRepository";
import { Branch } from "@/modules/branches/domain/entities/Branch";
import { BranchNotFoundError } from "@/modules/branches/domain/errors/BranchNotFoundError";
import { BranchCodeAlreadyInUseError } from "@/modules/branches/domain/errors/BranchCodeAlreadyInUseError";
import { AnotherBranchIsHeadquartersError } from "@/modules/branches/domain/errors/AnotherBranchIsHeadquartersError";

export class InMemoryBranchRepository implements BranchRepository {
  private store: Map<string, Branch> = new Map();

  seed(items: Branch[]): void { for (const b of items) this.store.set(b.id, b); }

  async findAll({ page, pageSize, includeInactive }: FindAllBranchesOptions): Promise<{ items: Branch[]; total: number }> {
    const all = [...this.store.values()].filter((b) => includeInactive || b.isActive);
    const skip = (page - 1) * pageSize;
    return { items: all.slice(skip, skip + pageSize), total: all.length };
  }

  async findById(id: string): Promise<Branch | null> { return this.store.get(id) ?? null; }

  async findHeadquarters(): Promise<Branch | null> {
    return [...this.store.values()].find((b) => b.isHeadquarters) ?? null;
  }

  async create(data: CreateBranchData): Promise<Branch> {
    if ([...this.store.values()].find((b) => b.code === data.code)) throw new BranchCodeAlreadyInUseError();
    if (data.isHeadquarters && [...this.store.values()].find((b) => b.isHeadquarters)) {
      throw new AnotherBranchIsHeadquartersError();
    }
    const now = new Date();
    const b = Branch.create(randomUUID(), {
      code: data.code,
      name: data.name,
      address: data.address ?? null,
      phone: data.phone ?? null,
      email: data.email ?? null,
      isHeadquarters: data.isHeadquarters ?? false,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
    this.store.set(b.id, b);
    return b;
  }

  async update(id: string, data: UpdateBranchData): Promise<Branch> {
    const existing = this.store.get(id);
    if (!existing) throw new BranchNotFoundError();
    if (data.isHeadquarters === true && !existing.isHeadquarters) {
      const otherHq = [...this.store.values()].find((b) => b.isHeadquarters && b.id !== id);
      if (otherHq) throw new AnotherBranchIsHeadquartersError();
    }
    const updated = Branch.create(id, {
      code: existing.code,
      name: data.name ?? existing.name,
      address: data.address !== undefined ? data.address : existing.address,
      phone: data.phone !== undefined ? data.phone : existing.phone,
      email: data.email !== undefined ? data.email : existing.email,
      isHeadquarters: data.isHeadquarters !== undefined ? data.isHeadquarters : existing.isHeadquarters,
      isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });
    this.store.set(id, updated);
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const existing = this.store.get(id);
    if (!existing) throw new BranchNotFoundError();
    this.store.set(id, Branch.create(id, {
      code: existing.code,
      name: existing.name,
      address: existing.address,
      phone: existing.phone,
      email: existing.email,
      isHeadquarters: existing.isHeadquarters,
      isActive: false,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    }));
  }
}
