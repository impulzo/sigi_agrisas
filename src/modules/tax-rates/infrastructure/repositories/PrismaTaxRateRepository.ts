import { PrismaClient, TaxRate as PrismaTaxRate } from "@prisma/client";
import { TaxRateRepository, FindAllTaxRatesOptions, CreateTaxRateData, UpdateTaxRateData } from "../../application/ports/TaxRateRepository";
import { TaxRate } from "../../domain/entities/TaxRate";

function toDomain(p: PrismaTaxRate): TaxRate {
  return TaxRate.create({
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    satTaxCode: p.satTaxCode,
    factorType: p.factorType,
    displayValue: Number(p.displayValue),
    rate: Number(p.rate),
    transferredAccount: p.transferredAccount,
    pendingTransferredAccount: p.pendingTransferredAccount,
    creditedAccount: p.creditedAccount,
    pendingCreditedAccount: p.pendingCreditedAccount,
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
        orderBy: { createdAt: "desc" },
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
        satTaxCode: data.satTaxCode,
        factorType: data.factorType,
        displayValue: data.displayValue,
        rate: data.rate,
        transferredAccount: data.transferredAccount ?? null,
        pendingTransferredAccount: data.pendingTransferredAccount ?? null,
        creditedAccount: data.creditedAccount ?? null,
        pendingCreditedAccount: data.pendingCreditedAccount ?? null,
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
        ...(data.satTaxCode !== undefined && { satTaxCode: data.satTaxCode }),
        ...(data.factorType !== undefined && { factorType: data.factorType }),
        ...(data.displayValue !== undefined && { displayValue: data.displayValue }),
        ...(data.rate !== undefined && { rate: data.rate }),
        ...(data.transferredAccount !== undefined && { transferredAccount: data.transferredAccount }),
        ...(data.pendingTransferredAccount !== undefined && { pendingTransferredAccount: data.pendingTransferredAccount }),
        ...(data.creditedAccount !== undefined && { creditedAccount: data.creditedAccount }),
        ...(data.pendingCreditedAccount !== undefined && { pendingCreditedAccount: data.pendingCreditedAccount }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
    return toDomain(r);
  }

  async findActiveProductCount(id: string): Promise<number> {
    return this.prisma.product.count({ where: { taxRateId: id, isActive: true } });
  }
}
