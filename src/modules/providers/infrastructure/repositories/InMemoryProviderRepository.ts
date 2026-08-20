import { ProviderRepository, CreateProviderData, UpdateProviderData, FindAllOptions } from "../../application/ports/ProviderRepository";
import { Provider } from "../../domain/entities/Provider";
import { ProviderNotFoundError } from "../../domain/errors/ProviderNotFoundError";
import { ProviderCodeAlreadyInUseError } from "../../domain/errors/ProviderCodeAlreadyInUseError";
import { ProviderRfcAlreadyInUseError } from "../../domain/errors/ProviderRfcAlreadyInUseError";

let idCounter = 0;

function makeId(): string {
  return `test-provider-${++idCounter}`;
}

export class InMemoryProviderRepository implements ProviderRepository {
  private store: Provider[] = [];
  private activeDepartmentCounts: Map<string, number> = new Map();

  async findAll({ page, pageSize, includeInactive, search }: FindAllOptions): Promise<{ items: Provider[]; total: number }> {
    let items = includeInactive ? this.store : this.store.filter((p) => p.isActive);

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.legalName ?? "").toLowerCase().includes(q) ||
          (p.rfc ?? "").toLowerCase().includes(q)
      );
    }

    const total = items.length;
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total };
  }

  async findById(id: string): Promise<Provider | null> {
    return this.store.find((p) => p.id === id) ?? null;
  }

  async create(data: CreateProviderData): Promise<Provider> {
    if (this.store.some((p) => p.code === data.code)) {
      throw new ProviderCodeAlreadyInUseError(data.code);
    }
    if (data.rfc != null && this.store.some((p) => p.rfc === data.rfc)) {
      throw new ProviderRfcAlreadyInUseError(data.rfc);
    }

    const now = new Date();
    const provider = Provider.create({
      id: makeId(),
      code: data.code,
      name: data.name,
      rfc: data.rfc ?? null,
      legalName: data.legalName ?? null,
      taxRegime: data.taxRegime ?? null,
      cfdiUse: data.cfdiUse ?? null,
      taxZipCode: data.taxZipCode ?? null,
      email: data.email ?? null,
      phone: data.phone ?? null,
      address: data.address ?? null,
      contactName: data.contactName ?? null,
      notes: data.notes ?? null,
      creditLimit: data.creditLimit ?? null,
      currentBalance: data.initialBalance ?? 0,
      initialBalance: data.initialBalance ?? 0,
      creditDays: data.creditDays ?? 30,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    this.store.push(provider);
    return provider;
  }

  async update(id: string, data: UpdateProviderData): Promise<Provider> {
    const idx = this.store.findIndex((p) => p.id === id);
    if (idx === -1) throw new ProviderNotFoundError(id);

    if (data.rfc != null && this.store.some((p, i) => i !== idx && p.rfc === data.rfc)) {
      throw new ProviderRfcAlreadyInUseError(data.rfc);
    }

    const existing = this.store[idx];
    const newInitialBalance = data.initialBalance !== undefined ? data.initialBalance : existing.initialBalance;
    const balanceDelta = data.initialBalance !== undefined ? data.initialBalance - existing.initialBalance : 0;
    const updated = Provider.create({
      id: existing.id,
      code: existing.code,
      name: data.name ?? existing.name,
      rfc: "rfc" in data ? data.rfc ?? null : existing.rfc,
      legalName: "legalName" in data ? data.legalName ?? null : existing.legalName,
      taxRegime: "taxRegime" in data ? data.taxRegime ?? null : existing.taxRegime,
      cfdiUse: "cfdiUse" in data ? data.cfdiUse ?? null : existing.cfdiUse,
      taxZipCode: "taxZipCode" in data ? data.taxZipCode ?? null : existing.taxZipCode,
      email: "email" in data ? data.email ?? null : existing.email,
      phone: "phone" in data ? data.phone ?? null : existing.phone,
      address: "address" in data ? data.address ?? null : existing.address,
      contactName: "contactName" in data ? data.contactName ?? null : existing.contactName,
      notes: "notes" in data ? data.notes ?? null : existing.notes,
      creditLimit: "creditLimit" in data ? data.creditLimit ?? null : existing.creditLimit,
      currentBalance: existing.currentBalance + balanceDelta,
      initialBalance: newInitialBalance,
      creditDays: data.creditDays ?? existing.creditDays,
      isActive: data.isActive ?? existing.isActive,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });

    this.store[idx] = updated;
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const idx = this.store.findIndex((p) => p.id === id);
    if (idx === -1) throw new ProviderNotFoundError(id);
    await this.update(id, { isActive: false });
  }

  async countActiveDepartmentsByProvider(providerId: string): Promise<number> {
    return this.activeDepartmentCounts.get(providerId) ?? 0;
  }

  setActiveDepartmentCount(providerId: string, count: number): void {
    this.activeDepartmentCounts.set(providerId, count);
  }

  reset(): void {
    this.store = [];
    this.activeDepartmentCounts.clear();
    idCounter = 0;
  }
}
