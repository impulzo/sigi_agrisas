import { PrismaClient, ProductDosification as PrismaProductDosification } from "@prisma/client";
import {
  ProductDosificationRepository,
  CreateProductDosificationData,
  UpdateProductDosificationData,
} from "../../application/ports/ProductDosificationRepository";
import { ProductDosification } from "../../domain/entities/ProductDosification";
import { ProductDosificationNotFoundError } from "../../domain/errors/ProductDosificationNotFoundError";
import { DuplicateDosificationNameError } from "../../domain/errors/DuplicateDosificationNameError";

function toProductDosification(row: PrismaProductDosification): ProductDosification {
  return ProductDosification.create({
    id: row.id,
    productId: row.productId,
    name: row.name,
    numParts: row.numParts,
    isActive: row.isActive,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });
}

function isUniqueError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

function isNotFoundError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2025";
}

export class PrismaProductDosificationRepository implements ProductDosificationRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByProductId(productId: string): Promise<ProductDosification[]> {
    const rows = await this.prisma.productDosification.findMany({
      where: { productId },
      orderBy: [{ numParts: "asc" }, { name: "asc" }],
    });
    return rows.map(toProductDosification);
  }

  async findById(id: string): Promise<ProductDosification | null> {
    const row = await this.prisma.productDosification.findUnique({ where: { id } });
    return row ? toProductDosification(row) : null;
  }

  async create(data: CreateProductDosificationData): Promise<ProductDosification> {
    try {
      const row = await this.prisma.productDosification.create({
        data: {
          productId: data.productId,
          name: data.name,
          numParts: data.numParts,
          isActive: data.isActive,
        },
      });
      return toProductDosification(row);
    } catch (err) {
      if (isUniqueError(err)) throw new DuplicateDosificationNameError(data.name);
      throw err;
    }
  }

  async update(id: string, data: UpdateProductDosificationData): Promise<ProductDosification> {
    try {
      const row = await this.prisma.productDosification.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.numParts !== undefined ? { numParts: data.numParts } : {}),
          ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        },
      });
      return toProductDosification(row);
    } catch (err) {
      if (isNotFoundError(err)) throw new ProductDosificationNotFoundError(id);
      if (isUniqueError(err)) throw new DuplicateDosificationNameError(data.name ?? "");
      throw err;
    }
  }

  async softDelete(id: string): Promise<void> {
    try {
      await this.prisma.productDosification.update({ where: { id }, data: { isActive: false } });
    } catch (err) {
      if (isNotFoundError(err)) throw new ProductDosificationNotFoundError(id);
      throw err;
    }
  }
}
