import { randomUUID } from "crypto";
import { VehicleRepository, CreateVehicleData, UpdateVehicleData, FindAllOptions } from "../../application/ports/VehicleRepository";
import { Vehicle } from "../../domain/entities/Vehicle";
import { VehicleNotFoundError } from "../../domain/errors/VehicleNotFoundError";
import { VehicleCodeAlreadyInUseError } from "../../domain/errors/VehicleCodeAlreadyInUseError";

export class InMemoryVehicleRepository implements VehicleRepository {
  private store: Vehicle[] = [];

  async findAll({ page, pageSize, includeInactive, search }: FindAllOptions): Promise<{ items: Vehicle[]; total: number }> {
    let items = includeInactive ? this.store : this.store.filter((v) => v.isActive);

    if (search) {
      const q = search.toLowerCase();
      items = items.filter(
        (v) => v.code.toLowerCase().includes(q) || v.plate.toLowerCase().includes(q)
      );
    }

    const total = items.length;
    const start = (page - 1) * pageSize;
    return { items: items.slice(start, start + pageSize), total };
  }

  async findById(id: string): Promise<Vehicle | null> {
    return this.store.find((v) => v.id === id) ?? null;
  }

  async create(data: CreateVehicleData): Promise<Vehicle> {
    if (this.store.some((v) => v.code === data.code)) {
      throw new VehicleCodeAlreadyInUseError(data.code);
    }

    const now = new Date();
    const vehicle = Vehicle.create({
      id: randomUUID(),
      code: data.code,
      plate: data.plate,
      vehicleConfig: data.vehicleConfig,
      permitType: data.permitType,
      permitNumber: data.permitNumber,
      insuranceCompany: data.insuranceCompany,
      insurancePolicy: data.insurancePolicy,
      notes: data.notes ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    this.store.push(vehicle);
    return vehicle;
  }

  async update(id: string, data: UpdateVehicleData): Promise<Vehicle> {
    const idx = this.store.findIndex((v) => v.id === id);
    if (idx === -1) throw new VehicleNotFoundError(id);

    const existing = this.store[idx];
    const updated = Vehicle.create({
      id: existing.id,
      code: existing.code,
      plate: data.plate ?? existing.plate,
      vehicleConfig: data.vehicleConfig ?? existing.vehicleConfig,
      permitType: data.permitType ?? existing.permitType,
      permitNumber: data.permitNumber ?? existing.permitNumber,
      insuranceCompany: data.insuranceCompany ?? existing.insuranceCompany,
      insurancePolicy: data.insurancePolicy ?? existing.insurancePolicy,
      notes: "notes" in data ? data.notes ?? null : existing.notes,
      isActive: data.isActive ?? existing.isActive,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });

    this.store[idx] = updated;
    return updated;
  }

  reset(): void {
    this.store = [];
  }
}
