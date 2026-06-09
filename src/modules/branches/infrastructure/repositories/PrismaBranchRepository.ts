import { PrismaClient } from "@prisma/client";
import { BranchRepository, FindAllBranchesOptions, CreateBranchData, UpdateBranchData } from "@/modules/branches/application/ports/BranchRepository";
import { Branch } from "@/modules/branches/domain/entities/Branch";
import { BranchNotFoundError } from "@/modules/branches/domain/errors/BranchNotFoundError";
import { BranchCodeAlreadyInUseError } from "@/modules/branches/domain/errors/BranchCodeAlreadyInUseError";
import { AnotherBranchIsHeadquartersError } from "@/modules/branches/domain/errors/AnotherBranchIsHeadquartersError";

type PrismaBranch = {
  id: string;
  code: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  isHeadquarters: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toDomain(row: PrismaBranch): Branch {
  return Branch.create(row.id, {
    code: row.code,
    name: row.name,
    address: row.address,
    phone: row.phone,
    email: row.email,
    isHeadquarters: row.isHeadquarters,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function isPrismaUniqueError(err: unknown, target?: string): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: string; meta?: { target?: string[] | string } };
  if (e.code !== "P2002") return false;
  if (!target) return true;
  const t = e.meta?.target;
  if (Array.isArray(t)) return t.some((f) => f.includes(target));
  if (typeof t === "string") return t.includes(target);
  return false;
}
function isPrismaNotFoundError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2025";
}

export class PrismaBranchRepository implements BranchRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll({ page, pageSize, includeInactive }: FindAllBranchesOptions): Promise<{ items: Branch[]; total: number }> {
    const where = includeInactive ? {} : { isActive: true };
    const skip = (page - 1) * pageSize;
    const [rows, total] = await Promise.all([
      this.prisma.branch.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.branch.count({ where }),
    ]);
    return { items: rows.map(toDomain), total };
  }

  async findById(id: string): Promise<Branch | null> {
    const row = await this.prisma.branch.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async findHeadquarters(): Promise<Branch | null> {
    const row = await this.prisma.branch.findFirst({ where: { isHeadquarters: true } });
    return row ? toDomain(row) : null;
  }

  async create(data: CreateBranchData): Promise<Branch> {
    try {
      const row = await this.prisma.branch.create({
        data: {
          code: data.code,
          name: data.name,
          address: data.address ?? null,
          phone: data.phone ?? null,
          email: data.email ?? null,
          isHeadquarters: data.isHeadquarters ?? false,
          isActive: data.isActive ?? true,
        },
      });
      return toDomain(row);
    } catch (err) {
      if (isPrismaUniqueError(err, "is_headquarters")) throw new AnotherBranchIsHeadquartersError();
      if (isPrismaUniqueError(err, "isHeadquarters")) throw new AnotherBranchIsHeadquartersError();
      if (isPrismaUniqueError(err)) throw new BranchCodeAlreadyInUseError();
      throw err;
    }
  }

  async update(id: string, data: UpdateBranchData): Promise<Branch> {
    try {
      return toDomain(await this.prisma.branch.update({ where: { id }, data }));
    } catch (err) {
      if (isPrismaNotFoundError(err)) throw new BranchNotFoundError();
      if (isPrismaUniqueError(err, "is_headquarters")) throw new AnotherBranchIsHeadquartersError();
      if (isPrismaUniqueError(err, "isHeadquarters")) throw new AnotherBranchIsHeadquartersError();
      throw err;
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      await this.prisma.branch.update({ where: { id }, data: { isActive: false } });
    } catch (err) {
      if (isPrismaNotFoundError(err)) throw new BranchNotFoundError();
      throw err;
    }
  }
}
