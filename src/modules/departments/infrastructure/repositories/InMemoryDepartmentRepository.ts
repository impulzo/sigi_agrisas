import { randomUUID } from "crypto";
import { DepartmentRepository, FindAllDepartmentsOptions, CreateDepartmentData, UpdateDepartmentData } from "@/modules/departments/application/ports/DepartmentRepository";
import { Department } from "@/modules/departments/domain/entities/Department";
import { DepartmentNotFoundError } from "@/modules/departments/domain/errors/DepartmentNotFoundError";
import { DepartmentCodeAlreadyInUseError } from "@/modules/departments/domain/errors/DepartmentCodeAlreadyInUseError";

export class InMemoryDepartmentRepository implements DepartmentRepository {
  private store: Map<string, Department> = new Map();

  seed(items: Department[]): void { for (const d of items) this.store.set(d.id, d); }

  async findAll({ page, pageSize, includeInactive }: FindAllDepartmentsOptions): Promise<{ items: Department[]; total: number }> {
    const all = [...this.store.values()].filter((d) => includeInactive || d.isActive);
    const skip = (page - 1) * pageSize;
    return { items: all.slice(skip, skip + pageSize), total: all.length };
  }

  async findById(id: string): Promise<Department | null> { return this.store.get(id) ?? null; }

  async create(data: CreateDepartmentData): Promise<Department> {
    if ([...this.store.values()].find((d) => d.code === data.code)) throw new DepartmentCodeAlreadyInUseError();
    const now = new Date();
    const d = Department.create(randomUUID(), { code: data.code, name: data.name, description: data.description ?? null, isActive: data.isActive ?? true, createdAt: now, updatedAt: now });
    this.store.set(d.id, d);
    return d;
  }

  async update(id: string, data: UpdateDepartmentData): Promise<Department> {
    const existing = this.store.get(id);
    if (!existing) throw new DepartmentNotFoundError();
    const updated = Department.create(id, {
      code: existing.code,
      name: data.name ?? existing.name,
      description: data.description !== undefined ? data.description : existing.description,
      isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    });
    this.store.set(id, updated);
    return updated;
  }

  async softDelete(id: string): Promise<void> {
    const existing = this.store.get(id);
    if (!existing) throw new DepartmentNotFoundError();
    this.store.set(id, Department.create(id, { code: existing.code, name: existing.name, description: existing.description, isActive: false, createdAt: existing.createdAt, updatedAt: new Date() }));
  }
}
