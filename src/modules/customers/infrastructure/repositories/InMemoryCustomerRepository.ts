import { randomUUID } from "crypto";
import {
  CustomerRepository,
  CreateCustomerData,
  UpdateCustomerData,
  FindAllOptions,
} from "../../application/ports/CustomerRepository";
import { Customer } from "../../domain/entities/Customer";
import { CustomerNotFoundError } from "../../domain/errors/CustomerNotFoundError";
import { CustomerCodeAlreadyInUseError } from "../../domain/errors/CustomerCodeAlreadyInUseError";
import { CustomerRfcAlreadyInUseError } from "../../domain/errors/CustomerRfcAlreadyInUseError";

function makeId(): string {
  return randomUUID();
}

export class InMemoryCustomerRepository implements CustomerRepository {
  private store: Customer[] = [];

  async findAll({ page, pageSize, includeInactive, search }: FindAllOptions): Promise<{ items: Customer[]; total: number }> {
    let items = includeInactive ? this.store : this.store.filter((c) => c.isActive);

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          (c.legalName ?? "").toLowerCase().includes(q) ||
          c.rfc.toLowerCase().includes(q)
      );
    }

    const total = items.length;
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total };
  }

  async findById(id: string): Promise<Customer | null> {
    return this.store.find((c) => c.id === id) ?? null;
  }

  async create(data: CreateCustomerData): Promise<Customer> {
    if (this.store.some((c) => c.code === data.code)) {
      throw new CustomerCodeAlreadyInUseError(data.code);
    }
    if (this.store.some((c) => c.rfc === data.rfc)) {
      throw new CustomerRfcAlreadyInUseError(data.rfc);
    }

    const now = new Date();
    const customer = Customer.create({
      id: makeId(),
      code: data.code,
      name: data.name,
      rfc: data.rfc,
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
      currentBalance: 0,
      isActive: data.isActive ?? true,
      createdAt: now,
      updatedAt: now,
    });

    this.store.push(customer);
    return customer;
  }

  async update(id: string, data: UpdateCustomerData): Promise<Customer> {
    const idx = this.store.findIndex((c) => c.id === id);
    if (idx === -1) throw new CustomerNotFoundError(id);

    if (data.rfc !== undefined && this.store.some((c, i) => i !== idx && c.rfc === data.rfc)) {
      throw new CustomerRfcAlreadyInUseError(data.rfc!);
    }

    const existing = this.store[idx];
    const updated = Customer.create({
      id: existing.id,
      code: existing.code,
      name: data.name ?? existing.name,
      rfc: data.rfc ?? existing.rfc,
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
      currentBalance: existing.currentBalance,
      isActive: data.isActive ?? existing.isActive,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });

    this.store[idx] = updated;
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const idx = this.store.findIndex((c) => c.id === id);
    if (idx === -1) throw new CustomerNotFoundError(id);
    await this.update(id, { isActive: false });
  }

  reset(): void {
    this.store = [];
  }
}
