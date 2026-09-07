import { PrismaClient, Provider as PrismaProvider, Prisma } from "@prisma/client";
import { ProviderRepository, CreateProviderData, UpdateProviderData, FindAllOptions } from "../../application/ports/ProviderRepository";
import { Provider } from "../../domain/entities/Provider";
import { ProviderNotFoundError } from "../../domain/errors/ProviderNotFoundError";
import { ProviderCodeAlreadyInUseError } from "../../domain/errors/ProviderCodeAlreadyInUseError";
import { ProviderRfcAlreadyInUseError } from "../../domain/errors/ProviderRfcAlreadyInUseError";
import { isPrismaUniqueError, isPrismaNotFoundError } from "@/shared/infrastructure/prisma/errors";

function toProvider(row: PrismaProvider): Provider {
  return Provider.create({
    id: row.id,
    code: row.code,
    name: row.name,
    rfc: row.rfc,
    legalName: row.legalName,
    taxRegime: row.taxRegime,
    cfdiUse: row.cfdiUse,
    taxZipCode: row.taxZipCode,
    email: row.email,
    phone: row.phone,
    address: row.address,
    contactName: row.contactName,
    notes: row.notes,
    creditLimit: row.creditLimit ? Number(row.creditLimit) : null,
    currentBalance: Number(row.currentBalance),
    initialBalance: Number(row.initialBalance),
    creditDays: row.creditDays,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

export class PrismaProviderRepository implements ProviderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll({ page, pageSize, includeInactive, search }: FindAllOptions): Promise<{ items: Provider[]; total: number }> {
    const skip = (page - 1) * pageSize;

    const where: Prisma.ProviderWhereInput = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { legalName: { contains: search, mode: "insensitive" } },
              { rfc: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.provider.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.provider.count({ where }),
    ]);

    return { items: rows.map(toProvider), total };
  }

  async findById(id: string): Promise<Provider | null> {
    const row = await this.prisma.provider.findUnique({ where: { id } });
    return row ? toProvider(row) : null;
  }

  async create(data: CreateProviderData): Promise<Provider> {
    try {
      const row = await this.prisma.provider.create({
        data: {
          ...data,
          currentBalance: data.initialBalance ?? 0,
          initialBalance: data.initialBalance ?? 0,
        },
      });
      return toProvider(row);
    } catch (err) {
      if (isPrismaUniqueError(err, "code")) throw new ProviderCodeAlreadyInUseError(data.code);
      if (isPrismaUniqueError(err, "rfc")) throw new ProviderRfcAlreadyInUseError(data.rfc ?? "");
      throw err;
    }
  }

  async update(id: string, data: UpdateProviderData): Promise<Provider> {
    let balanceDelta: number | null = null;
    if (data.initialBalance !== undefined) {
      const existing = await this.prisma.provider.findUnique({ where: { id }, select: { initialBalance: true } });
      if (!existing) throw new ProviderNotFoundError(id);
      balanceDelta = data.initialBalance - Number(existing.initialBalance);
    }
    try {
      const row = await this.prisma.provider.update({
        where: { id },
        data: {
          ...data,
          ...(balanceDelta !== null ? { currentBalance: { increment: balanceDelta } } : {}),
        },
      });
      return toProvider(row);
    } catch (err) {
      if (isPrismaNotFoundError(err)) throw new ProviderNotFoundError(id);
      if (isPrismaUniqueError(err, "rfc")) throw new ProviderRfcAlreadyInUseError(data.rfc ?? "");
      throw err;
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      await this.prisma.provider.update({ where: { id }, data: { isActive: false } });
    } catch (err) {
      if (isPrismaNotFoundError(err)) throw new ProviderNotFoundError(id);
      throw err;
    }
  }

  async countActiveDepartmentsByProvider(providerId: string): Promise<number> {
    return this.prisma.department.count({ where: { providerId, isActive: true } });
  }
}
