import { PrismaClient, TaxRate as PrismaTaxRate } from "@prisma/client";
import { TaxRateRepository, FindAllTaxRatesOptions, CreateTaxRateData, UpdateTaxRateData } from "../../application/ports/TaxRateRepository";
import { TaxRate } from "../../domain/entities/TaxRate";

function toDomain(p: PrismaTaxRate): TaxRate {
  return TaxRate.create({
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    rate: Number(p.rate),
    isActive: p.isActive,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  });
}

export class PrismaTaxRateRepository implements TaxRateRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll({ page, pageSize, includeInactive }: FindAllTaxRatesOptions): Promise<{ items: TaxRate[]; total: number }> {
    const where = includeInactive ? {} : { isActive: true };
    const [items, total] = await Promise.all([
      this.prisma.taxRate.findMany({
        where,
        orderBy: { code: "asc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.taxRate.count({ where }),
    ]);
    return { items: items.map(toDomain), total };
  }

  async findById(id: string): Promise<TaxRate | null> {
    const r = await this.prisma.taxRate.findUnique({ where: { id } });
    return r ? toDomain(r) : null;
  }

  async findByCode(code: string): Promise<TaxRate | null> {
    const r = await this.prisma.taxRate.findUnique({ where: { code } });
    return r ? toDomain(r) : null;
  }

  async create(data: CreateTaxRateData): Promise<TaxRate> {
    const r = await this.prisma.taxRate.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        rate: data.rate,
        isActive: data.isActive ?? true,
      },
    });
    return toDomain(r);
  }

  async update(id: string, data: UpdateTaxRateData): Promise<TaxRate> {
    const r = await this.prisma.taxRate.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.rate !== undefined && { rate: data.rate }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    return toDomain(r);
  }

  async findActiveProductCount(id: string): Promise<number> {
    return this.prisma.product.count({ where: { taxRateId: id, isActive: true } });
  }
}
