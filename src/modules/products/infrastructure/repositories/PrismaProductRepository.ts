import { PrismaClient, Prisma } from "@prisma/client";
import {
  ProductRepository,
  ProductWithDepartment,
  CreateProductData,
  UpdateProductData,
  FindAllProductsOptions,
} from "../../application/ports/ProductRepository";
import { Product } from "../../domain/entities/Product";
import { ProductNotFoundError } from "../../domain/errors/ProductNotFoundError";
import { ProductCodeAlreadyInUseError } from "../../domain/errors/ProductCodeAlreadyInUseError";

const INCLUDE_WITH_RELATIONS = {
  department: { select: { name: true, providerId: true, provider: { select: { id: true, name: true } } } },
  taxRate: { select: { code: true } },
} as const;

type ProductRow = Prisma.ProductGetPayload<{ include: typeof INCLUDE_WITH_RELATIONS }>;

function decToNullableNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

function toProductWithDepartment(row: ProductRow): ProductWithDepartment {
  return {
    product: Product.create({
      id: row.id,
      code: row.code,
      name: row.name,
      unit: row.unit,
      satProductCode: row.satProductCode,
      departmentId: row.departmentId,
      taxRateId: row.taxRateId ?? null,
      ivaRate: decToNullableNumber(row.ivaRate),
      iepsRate: decToNullableNumber(row.iepsRate),
      imageUrl: row.imageUrl ?? null,
      isTaxable: row.isTaxable,
      isActive: row.isActive,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }),
    departmentName: row.department?.name ?? "",
    taxRateCode: row.taxRate?.code ?? null,
    providerId: row.department?.provider?.id ?? null,
    providerName: row.department?.provider?.name ?? null,
  };
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


export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll({
    page,
    pageSize,
    includeInactive,
    search,
    departmentId,
    providerId,
  }: FindAllProductsOptions): Promise<{ items: ProductWithDepartment[]; total: number }> {
    const skip = (page - 1) * pageSize;

    const where: Prisma.ProductWhereInput = {
      ...(includeInactive ? {} : { isActive: true }),
      ...(departmentId ? { departmentId } : {}),
      ...(providerId ? { department: { providerId } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { code: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [rows, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { createdAt: "desc" },
        include: INCLUDE_WITH_RELATIONS,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { items: rows.map(toProductWithDepartment), total };
  }

  async findById(id: string): Promise<ProductWithDepartment | null> {
    const row = await this.prisma.product.findUnique({ where: { id }, include: INCLUDE_WITH_RELATIONS });
    return row ? toProductWithDepartment(row) : null;
  }

  async create(data: CreateProductData): Promise<ProductWithDepartment> {
    try {
      const row = await this.prisma.product.create({
        data: {
          code: data.code,
          name: data.name,
          unit: data.unit,
          departmentId: data.departmentId,
          taxRateId: data.taxRateId ?? null,
          satProductCode: data.satProductCode ?? null,
          ivaRate: data.ivaRate ?? null,
          iepsRate: data.iepsRate ?? null,
          ...(data.isTaxable !== undefined ? { isTaxable: data.isTaxable } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
        include: INCLUDE_WITH_RELATIONS,
      });
      return toProductWithDepartment(row);
    } catch (err) {
      if (isPrismaUniqueError(err, "code")) throw new ProductCodeAlreadyInUseError(data.code);
      throw err;
    }
  }

  async update(id: string, data: UpdateProductData): Promise<ProductWithDepartment> {
    try {
      const row = await this.prisma.product.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.unit !== undefined ? { unit: data.unit } : {}),
          ...(data.departmentId !== undefined ? { departmentId: data.departmentId } : {}),
          ...("satProductCode" in data ? { satProductCode: data.satProductCode ?? null } : {}),
          ...("taxRateId" in data ? { taxRateId: data.taxRateId ?? null } : {}),
          ...("ivaRate" in data ? { ivaRate: data.ivaRate ?? null } : {}),
          ...("iepsRate" in data ? { iepsRate: data.iepsRate ?? null } : {}),
          ...("imageUrl" in data ? { imageUrl: data.imageUrl ?? null } : {}),
          ...(data.isTaxable !== undefined ? { isTaxable: data.isTaxable } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
        include: INCLUDE_WITH_RELATIONS,
      });
      return toProductWithDepartment(row);
    } catch (err) {
      if (isPrismaNotFoundError(err)) throw new ProductNotFoundError(id);
      throw err;
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      await this.prisma.product.update({ where: { id }, data: { isActive: false } });
    } catch (err) {
      if (isPrismaNotFoundError(err)) throw new ProductNotFoundError(id);
      throw err;
    }
  }
}
