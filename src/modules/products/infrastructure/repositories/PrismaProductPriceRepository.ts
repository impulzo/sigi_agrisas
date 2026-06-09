import { PrismaClient, Prisma, ProductPrice as PrismaProductPrice } from "@prisma/client";
import {
  ProductPriceRepository,
  CreateProductPriceData,
  UpdateProductPriceData,
} from "../../application/ports/ProductPriceRepository";
import { ProductPrice } from "../../domain/entities/ProductPrice";
import { ProductPriceNotFoundError } from "../../domain/errors/ProductPriceNotFoundError";
import { DuplicatePriceNameError } from "../../domain/errors/DuplicatePriceNameError";
import { DuplicateDefaultPriceError } from "../../domain/errors/DuplicateDefaultPriceError";

function toProductPrice(row: PrismaProductPrice): ProductPrice {
  return ProductPrice.create({
    id: row.id,
    productId: row.productId,
    name: row.name,
    price: row.price.toNumber(),
    minQuantity: row.minQuantity,
    discountPct: row.discountPct === null ? null : row.discountPct.toNumber(),
    isDefault: row.isDefault,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function uniqueTargetIncludes(err: unknown, needle: string): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: string; meta?: { target?: string[] | string } };
  if (e.code !== "P2002") return false;
  const t = e.meta?.target;
  if (Array.isArray(t)) return t.some((f) => f.includes(needle));
  if (typeof t === "string") return t.includes(needle);
  return false;
}

function isUniqueError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

function isNotFoundError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2025";
}

function mapWriteError(err: unknown, name: string): never {
  if (uniqueTargetIncludes(err, "default")) throw new DuplicateDefaultPriceError();
  if (isUniqueError(err)) throw new DuplicatePriceNameError(name);
  throw err;
}

export class PrismaProductPriceRepository implements ProductPriceRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByProductId(productId: string): Promise<ProductPrice[]> {
    const rows = await this.prisma.productPrice.findMany({
      where: { productId },
      orderBy: [{ isDefault: "desc" }, { minQuantity: "asc" }, { name: "asc" }],
    });
    return rows.map(toProductPrice);
  }

  async findById(id: string): Promise<ProductPrice | null> {
    const row = await this.prisma.productPrice.findUnique({ where: { id } });
    return row ? toProductPrice(row) : null;
  }

  async findDefaultByProductId(productId: string): Promise<ProductPrice | null> {
    const row = await this.prisma.productPrice.findFirst({ where: { productId, isDefault: true } });
    return row ? toProductPrice(row) : null;
  }

  async create(data: CreateProductPriceData): Promise<ProductPrice> {
    try {
      const row = await this.prisma.productPrice.create({
        data: {
          productId: data.productId,
          name: data.name,
          price: data.price,
          minQuantity: data.minQuantity,
          discountPct: data.discountPct ?? null,
          isDefault: data.isDefault,
        },
      });
      return toProductPrice(row);
    } catch (err) {
      mapWriteError(err, data.name);
    }
  }

  async update(id: string, data: UpdateProductPriceData): Promise<ProductPrice> {
    try {
      const row = await this.prisma.productPrice.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.price !== undefined ? { price: data.price } : {}),
          ...(data.minQuantity !== undefined ? { minQuantity: data.minQuantity } : {}),
          ...("discountPct" in data ? { discountPct: data.discountPct ?? null } : {}),
          ...(data.isDefault !== undefined ? { isDefault: data.isDefault } : {}),
        },
      });
      return toProductPrice(row);
    } catch (err) {
      if (isNotFoundError(err)) throw new ProductPriceNotFoundError(id);
      mapWriteError(err, data.name ?? "");
    }
  }

  async unsetDefaultForProduct(productId: string, exceptId?: string): Promise<void> {
    await this.prisma.productPrice.updateMany({
      where: { productId, isDefault: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
      data: { isDefault: false },
    });
  }

  async unsetDefaultAndUpdate(productId: string, priceId: string, data: UpdateProductPriceData): Promise<ProductPrice> {
    const [, row] = await this.prisma.$transaction([
      this.prisma.productPrice.updateMany({
        where: { productId, isDefault: true, id: { not: priceId } },
        data: { isDefault: false },
      }),
      this.prisma.productPrice.update({
        where: { id: priceId },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.price !== undefined ? { price: data.price } : {}),
          ...(data.minQuantity !== undefined ? { minQuantity: data.minQuantity } : {}),
          ...("discountPct" in data ? { discountPct: data.discountPct ?? null } : {}),
          isDefault: true,
        },
      }),
    ]);
    return toProductPrice(row);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.productPrice.delete({ where: { id } });
    } catch (err) {
      if (isNotFoundError(err)) throw new ProductPriceNotFoundError(id);
      throw err;
    }
  }
}
