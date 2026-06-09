import { PrismaClient } from "@prisma/client";
import { PaymentMethodRepository, FindAllOptions, CreatePaymentMethodData, UpdatePaymentMethodData } from "@/modules/payment-methods/application/ports/PaymentMethodRepository";
import { PaymentMethod } from "@/modules/payment-methods/domain/entities/PaymentMethod";
import { PaymentMethodNotFoundError } from "@/modules/payment-methods/domain/errors/PaymentMethodNotFoundError";
import { PaymentMethodCodeAlreadyInUseError } from "@/modules/payment-methods/domain/errors/PaymentMethodCodeAlreadyInUseError";

type PrismaPaymentMethod = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isCredit: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

function toDomain(row: PrismaPaymentMethod): PaymentMethod {
  return PaymentMethod.create(row.id, {
    code: row.code,
    name: row.name,
    description: row.description,
    isCredit: row.isCredit,
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

export class PrismaPaymentMethodRepository implements PaymentMethodRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll({ page, pageSize, includeInactive }: FindAllOptions): Promise<{ items: PaymentMethod[]; total: number }> {
    const where = includeInactive ? {} : { isActive: true };
    const skip = (page - 1) * pageSize;
    const [rows, total] = await Promise.all([
      this.prisma.paymentMethod.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
      this.prisma.paymentMethod.count({ where }),
    ]);
    return { items: rows.map(toDomain), total };
  }

  async findById(id: string): Promise<PaymentMethod | null> {
    const row = await this.prisma.paymentMethod.findUnique({ where: { id } });
    return row ? toDomain(row) : null;
  }

  async create(data: CreatePaymentMethodData): Promise<PaymentMethod> {
    try {
      const row = await this.prisma.paymentMethod.create({
        data: {
          code: data.code,
          name: data.name,
          description: data.description ?? null,
          isCredit: data.isCredit ?? false,
          isActive: data.isActive ?? true,
        },
      });
      return toDomain(row);
    } catch (err) {
      if (isPrismaUniqueError(err)) throw new PaymentMethodCodeAlreadyInUseError();
      throw err;
    }
  }

  async update(id: string, data: UpdatePaymentMethodData): Promise<PaymentMethod> {
    try {
      const row = await this.prisma.paymentMethod.update({ where: { id }, data });
      return toDomain(row);
    } catch (err) {
      if (isPrismaNotFoundError(err)) throw new PaymentMethodNotFoundError();
      throw err;
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      await this.prisma.paymentMethod.update({ where: { id }, data: { isActive: false } });
    } catch (err) {
      if (isPrismaNotFoundError(err)) throw new PaymentMethodNotFoundError();
      throw err;
    }
  }
}
