import { randomUUID } from "crypto";
import { PaymentMethodRepository, FindAllOptions, CreatePaymentMethodData, UpdatePaymentMethodData } from "@/modules/payment-methods/application/ports/PaymentMethodRepository";
import { PaymentMethod } from "@/modules/payment-methods/domain/entities/PaymentMethod";
import { PaymentMethodNotFoundError } from "@/modules/payment-methods/domain/errors/PaymentMethodNotFoundError";
import { PaymentMethodCodeAlreadyInUseError } from "@/modules/payment-methods/domain/errors/PaymentMethodCodeAlreadyInUseError";

export class InMemoryPaymentMethodRepository implements PaymentMethodRepository {
  private store: Map<string, PaymentMethod> = new Map();

  seed(methods: PaymentMethod[]): void {
    for (const m of methods) this.store.set(m.id, m);
  }

  async findAll({ page, pageSize, includeInactive }: FindAllOptions): Promise<{ items: PaymentMethod[]; total: number }> {
    const all = [...this.store.values()].filter((m) => includeInactive || m.isActive);
    const skip = (page - 1) * pageSize;
    return { items: all.slice(skip, skip + pageSize), total: all.length };
  }

  async findById(id: string): Promise<PaymentMethod | null> {
    return this.store.get(id) ?? null;
  }

  async create(data: CreatePaymentMethodData): Promise<PaymentMethod> {
    const exists = [...this.store.values()].find((m) => m.code === data.code);
    if (exists) throw new PaymentMethodCodeAlreadyInUseError();
    const now = new Date();
    const pm = PaymentMethod.create(randomUUID(), {
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      isCredit: data.isCredit ?? false,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });
    this.store.set(pm.id, pm);
    return pm;
  }

  async update(id: string, data: UpdatePaymentMethodData): Promise<PaymentMethod> {
    const existing = this.store.get(id);
    if (!existing) throw new PaymentMethodNotFoundError();
    const updated = PaymentMethod.create(id, {
      code: existing.code,
      name: data.name ?? existing.name,
      description: data.description !== undefined ? data.description : existing.description,
      isCredit: existing.isCredit,
      isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });
    this.store.set(id, updated);
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const existing = this.store.get(id);
    if (!existing) throw new PaymentMethodNotFoundError();
    const updated = PaymentMethod.create(id, {
      code: existing.code,
      name: existing.name,
      description: existing.description,
      isCredit: existing.isCredit,
      isActive: false,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });
    this.store.set(id, updated);
  }
}
