import { randomUUID } from "crypto";
import { DriverRepository, CreateDriverData, UpdateDriverData, FindAllOptions } from "../../application/ports/DriverRepository";
import { Driver } from "../../domain/entities/Driver";
import { DriverNotFoundError } from "../../domain/errors/DriverNotFoundError";
import { DriverCodeAlreadyInUseError } from "../../domain/errors/DriverCodeAlreadyInUseError";

export class InMemoryDriverRepository implements DriverRepository {
  private store: Driver[] = [];

  reset(): void {
    this.store = [];
  }

  async findAll({ page, pageSize, includeInactive, search }: FindAllOptions): Promise<{ items: Driver[]; total: number }> {
    let items = this.store.filter((d) => includeInactive || d.isActive);

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (d) =>
          d.code.toLowerCase().includes(q) ||
          d.name.toLowerCase().includes(q) ||
          (d.rfc ?? "").toLowerCase().includes(q)
      );
    }

    const total = items.length;
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total };
  }

  async findById(id: string): Promise<Driver | null> {
    return this.store.find((d) => d.id === id) ?? null;
  }

  async create(data: CreateDriverData): Promise<Driver> {
    if (this.store.some((d) => d.code === data.code)) {
      throw new DriverCodeAlreadyInUseError(data.code);
    }
    const now = new Date();
    const driver = Driver.create({
      id: randomUUID(),
      code: data.code,
      name: data.name,
      rfc: data.rfc ?? null,
      licenseNumber: data.licenseNumber,
      notes: data.notes ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
    this.store.push(driver);
    return driver;
  }

  async update(id: string, data: UpdateDriverData): Promise<Driver> {
    const idx = this.store.findIndex((d) => d.id === id);
    if (idx === -1) throw new DriverNotFoundError(id);

    const current = this.store[idx];
    const updated = Driver.create({
      id: current.id,
      code: current.code,
      name: data.name ?? current.name,
      rfc: data.rfc !== undefined ? data.rfc : current.rfc,
      licenseNumber: data.licenseNumber ?? current.licenseNumber,
      notes: data.notes !== undefined ? data.notes : current.notes,
      isActive: data.isActive ?? current.isActive,
      createdAt: current.createdAt,
      updatedAt: new Date(),
    });
    this.store[idx] = updated;
    return updated;
  }
}
