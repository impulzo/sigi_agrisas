import { PrismaClient } from "@prisma/client";
import { FolioRepository, FindAllFoliosOptions, CreateFolioData, UpdateFolioData } from "@/modules/folios/application/ports/FolioRepository";
import { Folio } from "@/modules/folios/domain/entities/Folio";
import { FolioNotFoundError } from "@/modules/folios/domain/errors/FolioNotFoundError";
import { FolioCodeAlreadyInUseError } from "@/modules/folios/domain/errors/FolioCodeAlreadyInUseError";

type PrismaFolio = {
  id: string;
  code: string;
  name: string;
  prefix: string | null;
  currentNumber: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toDomain(row: PrismaFolio): Folio {
  return Folio.create(row.id, {
    code: row.code,
    name: row.name,
    prefix: row.prefix,
    currentNumber: row.currentNumber,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function isPrismaUniqueError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

function isPrismaNotFoundError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2025";
}

export class PrismaFolioRepository implements FolioRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll({ page, pageSize, includeInactive }: FindAllFoliosOptions): Promise<{ items: Folio[]; total: number }> {
    const where = includeInactive ? {} : { isActive: true };
    const skip = (page - 1) * pageSize;
    const [rows, total] = await Promise.all([
      this.prisma.folio.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.folio.count({ where }),
    ]);
    return { items: rows.map(toDomain), total };
  }

  async findById(id: string): Promise<Folio | null> {
    const row = await this.prisma.folio.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async create(data: CreateFolioData): Promise<Folio> {
    try {
      const row = await this.prisma.folio.create({
        data: {
          code: data.code,
          name: data.name,
          prefix: data.prefix ?? null,
          currentNumber: data.currentNumber ?? 0,
          isActive: data.isActive ?? true,
        },
      });
      return toDomain(row);
    } catch (err) {
      if (isPrismaUniqueError(err)) throw new FolioCodeAlreadyInUseError();
      throw err;
    }
  }

  async update(id: string, data: UpdateFolioData): Promise<Folio> {
    try {
      const row = await this.prisma.folio.update({ where: { id }, data });
      return toDomain(row);
    } catch (err) {
      if (isPrismaNotFoundError(err)) throw new FolioNotFoundError();
      throw err;
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      await this.prisma.folio.update({ where: { id }, data: { isActive: false } });
    } catch (err) {
      if (isPrismaNotFoundError(err)) throw new FolioNotFoundError();
      throw err;
    }
  }
}
