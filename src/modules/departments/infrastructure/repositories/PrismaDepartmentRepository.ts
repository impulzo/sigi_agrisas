import { PrismaClient } from "@prisma/client";
import { DepartmentRepository, FindAllDepartmentsOptions, CreateDepartmentData, UpdateDepartmentData } from "@/modules/departments/application/ports/DepartmentRepository";
import { Department } from "@/modules/departments/domain/entities/Department";
import { DepartmentNotFoundError } from "@/modules/departments/domain/errors/DepartmentNotFoundError";
import { DepartmentCodeAlreadyInUseError } from "@/modules/departments/domain/errors/DepartmentCodeAlreadyInUseError";

type PrismaDepartment = { id: string; code: string; name: string; description: string | null; isActive: boolean; createdAt: Date; updatedAt: Date };

function toDomain(row: PrismaDepartment): Department {
  return Department.create(row.id, { code: row.code, name: row.name, description: row.description, isActive: row.isActive, createdAt: row.createdAt, updatedAt: row.updatedAt });
}

function isPrismaUniqueError(err: unknown): boolean { return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002"; }
function isPrismaNotFoundError(err: unknown): boolean { return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2025"; }

export class PrismaDepartmentRepository implements DepartmentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll({ page, pageSize, includeInactive }: FindAllDepartmentsOptions): Promise<{ items: Department[]; total: number }> {
    const where = includeInactive ? {} : { isActive: true };
    const skip = (page - 1) * pageSize;
    const [rows, total] = await Promise.all([
      this.prisma.department.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.department.count({ where }),
    ]);
    return { items: rows.map(toDomain), total };
  }

  async findById(id: string): Promise<Department | null> {
    const row = await this.prisma.department.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async create(data: CreateDepartmentData): Promise<Department> {
    try {
      const row = await this.prisma.department.create({ data: { code: data.code, name: data.name, description: data.description ?? null, isActive: data.isActive ?? true } });
      return toDomain(row);
    } catch (err) {
      if (isPrismaUniqueError(err)) throw new DepartmentCodeAlreadyInUseError();
      throw err;
    }
  }

  async update(id: string, data: UpdateDepartmentData): Promise<Department> {
    try {
      return toDomain(await this.prisma.department.update({ where: { id }, data }));
    } catch (err) {
      if (isPrismaNotFoundError(err)) throw new DepartmentNotFoundError();
      throw err;
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      await this.prisma.department.update({ where: { id }, data: { isActive: false } });
    } catch (err) {
      if (isPrismaNotFoundError(err)) throw new DepartmentNotFoundError();
      throw err;
    }
  }
}
