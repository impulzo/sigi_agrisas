import { randomUUID } from "crypto";
import { FolioRepository, FindAllFoliosOptions, CreateFolioData, UpdateFolioData } from "@/modules/folios/application/ports/FolioRepository";
import { Folio } from "@/modules/folios/domain/entities/Folio";
import { FolioNotFoundError } from "@/modules/folios/domain/errors/FolioNotFoundError";
import { FolioCodeAlreadyInUseError } from "@/modules/folios/domain/errors/FolioCodeAlreadyInUseError";

export class InMemoryFolioRepository implements FolioRepository {
  private store: Map<string, Folio> = new Map();

  seed(folios: Folio[]): void {
    for (const f of folios) this.store.set(f.id, f);
  }

  async findAll({ page, pageSize, includeInactive }: FindAllFoliosOptions): Promise<{ items: Folio[]; total: number }> {
    const all = [...this.store.values()].filter((f) => includeInactive || f.isActive);
    const skip = (page - 1) * pageSize;
    return { items: all.slice(skip, skip + pageSize), total: all.length };
  }

  async findById(id: string): Promise<Folio | null> {
    return this.store.get(id) ?? null;
  }

  async create(data: CreateFolioData): Promise<Folio> {
    const exists = [...this.store.values()].find((f) => f.code === data.code);
    if (exists) throw new FolioCodeAlreadyInUseError();
    const now = new Date();
    const f = Folio.create(randomUUID(), {
      code: data.code,
      name: data.name,
      prefix: data.prefix ?? null,
      currentNumber: data.currentNumber ?? 0,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
    this.store.set(f.id, f);
    return f;
  }

  async update(id: string, data: UpdateFolioData): Promise<Folio> {
    const existing = this.store.get(id);
    if (!existing) throw new FolioNotFoundError();
    const updated = Folio.create(id, {
      code: existing.code,
      name: data.name ?? existing.name,
      prefix: data.prefix !== undefined ? data.prefix : existing.prefix,
      currentNumber: data.currentNumber !== undefined ? data.currentNumber : existing.currentNumber,
      isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });
    this.store.set(id, updated);
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const existing = this.store.get(id);
    if (!existing) throw new FolioNotFoundError();
    const updated = Folio.create(id, {
      code: existing.code,
      name: existing.name,
      prefix: existing.prefix,
      currentNumber: existing.currentNumber,
      isActive: false,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });
    this.store.set(id, updated);
  }
}
