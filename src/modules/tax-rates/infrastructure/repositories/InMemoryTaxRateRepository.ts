import { randomUUID } from "crypto";
import {
  TaxRateRepository,
  FindAllTaxRatesOptions,
  CreateTaxRateData,
  UpdateTaxRateData,
} from "../../application/ports/TaxRateRepository";
import { TaxRate } from "../../domain/entities/TaxRate";

/** In-memory TaxRateRepository for unit tests. */
export class InMemoryTaxRateRepository implements TaxRateRepository {
  private taxRates: Map<string, TaxRate> = new Map();
  /** productCount[taxRateId] = number of active products using it */
  readonly activeProductCounts: Map<string, number> = new Map();

  async findAll({ page, pageSize, includeInactive }: FindAllTaxRatesOptions): Promise<{ items: TaxRate[]; total: number }> {
    let results = Array.from(this.taxRates.values());
    if (!includeInactive) results = results.filter((r) => r.isActive);
    results = [...results].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = results.length;
    const start = (page - 1) * pageSize;
    const items = results.slice(start, start + pageSize);
    return { items, total };
  }

  async findById(id: string): Promise<TaxRate | null> {
    return this.taxRates.get(id) ?? null;
  }

  async findByCode(code: string): Promise<TaxRate | null> {
    return Array.from(this.taxRates.values()).find((r) => r.code === code) ?? null;
  }

  async create(data: CreateTaxRateData): Promise<TaxRate> {
    const now = new Date();
    const taxRate = TaxRate.create({
      id: randomUUID(),
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      satTaxCode: data.satTaxCode,
      factorType: data.factorType,
      displayValue: data.displayValue,
      rate: data.rate,
      transferredAccount: data.transferredAccount ?? null,
      pendingTransferredAccount: data.pendingTransferredAccount ?? null,
      creditedAccount: data.creditedAccount ?? null,
      pendingCreditedAccount: data.pendingCreditedAccount ?? null,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
    this.taxRates.set(taxRate.id, taxRate);
    return taxRate;
  }

  async update(id: string, data: UpdateTaxRateData): Promise<TaxRate> {
    const existing = this.taxRates.get(id);
    if (!existing) throw new Error(`TaxRate ${id} not found`);

    const updated = TaxRate.create({
      id: existing.id,
      code: existing.code,
      name: data.name ?? existing.name,
      description: data.description !== undefined ? data.description : existing.description,
      satTaxCode: data.satTaxCode ?? existing.satTaxCode,
      factorType: data.factorType ?? existing.factorType,
      displayValue: data.displayValue ?? existing.displayValue,
      rate: data.rate ?? existing.rate,
      transferredAccount: data.transferredAccount !== undefined ? data.transferredAccount : existing.transferredAccount,
      pendingTransferredAccount:
        data.pendingTransferredAccount !== undefined ? data.pendingTransferredAccount : existing.pendingTransferredAccount,
      creditedAccount: data.creditedAccount !== undefined ? data.creditedAccount : existing.creditedAccount,
      pendingCreditedAccount:
        data.pendingCreditedAccount !== undefined ? data.pendingCreditedAccount : existing.pendingCreditedAccount,
      isActive: data.isActive ?? existing.isActive,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });
    this.taxRates.set(id, updated);
    return updated;
  }

  async findActiveProductCount(id: string): Promise<number> {
    return this.activeProductCounts.get(id) ?? 0;
  }

  /** Test helper — seed a TaxRate directly */
  seed(taxRate: TaxRate): void {
    this.taxRates.set(taxRate.id, taxRate);
  }

  /** Test helper — set a known active-product count for the "in use" guard */
  setActiveProductCount(id: string, count: number): void {
    this.activeProductCounts.set(id, count);
  }
}
