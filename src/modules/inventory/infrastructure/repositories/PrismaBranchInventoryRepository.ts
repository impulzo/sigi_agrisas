import { PrismaClient, Prisma } from "@prisma/client";
import {
  BranchInventoryRepository,
  BranchInventoryView,
  CreateBranchInventoryData,
  UpdateBranchInventoryData,
  FindAllBranchInventoryOptions,
} from "../../application/ports/BranchInventoryRepository";
import { BranchInventory } from "../../domain/entities/BranchInventory";
import { BranchInventoryRecordNotFoundError } from "../../domain/errors/BranchInventoryRecordNotFoundError";
import { BranchInventoryAlreadyExistsError } from "../../domain/errors/BranchInventoryAlreadyExistsError";
import { NegativeStockNotAllowedError } from "../../domain/errors/NegativeStockNotAllowedError";

type InventoryRow = Prisma.BranchInventoryGetPayload<{
  include: { product: { select: { code: true; name: true } } };
}>;

interface RawRow {
  id: string;
  branchId: string;
  productId: string;
  quantity: Prisma.Decimal | string | number;
  reservedQuantity: Prisma.Decimal | string | number;
  reorderPoint: Prisma.Decimal | string | number;
  updatedAt: Date;
  productCode: string;
  productName: string;
}

const INCLUDE_PRODUCT = { product: { select: { code: true, name: true } } } as const;

function toView(row: InventoryRow): BranchInventoryView {
  return {
    inventory: BranchInventory.create({
      id: row.id,
      branchId: row.branchId,
      productId: row.productId,
      quantity: row.quantity.toNumber(),
      reservedQuantity: row.reservedQuantity.toNumber(),
      reorderPoint: row.reorderPoint.toNumber(),
      updatedAt: row.updatedAt,
    }),
    productCode: row.product.code,
    productName: row.product.name,
  };
}

function rawToView(row: RawRow): BranchInventoryView {
  return {
    inventory: BranchInventory.create({
      id: row.id,
      branchId: row.branchId,
      productId: row.productId,
      quantity: Number(row.quantity),
      reservedQuantity: Number(row.reservedQuantity),
      reorderPoint: Number(row.reorderPoint),
      updatedAt: row.updatedAt,
    }),
    productCode: row.productCode,
    productName: row.productName,
  };
}

function isUniqueError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002";
}

function isNotFoundError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: string }).code === "P2025";
}

export class PrismaBranchInventoryRepository implements BranchInventoryRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findAll({
    branchId,
    page,
    pageSize,
    search,
    belowReorder,
  }: FindAllBranchInventoryOptions): Promise<{ items: BranchInventoryView[]; total: number }> {
    const skip = (page - 1) * pageSize;

    const conditions: Prisma.Sql[] = [Prisma.sql`bi.branch_id = ${branchId}`];
    if (search) {
      const like = `%${search}%`;
      conditions.push(Prisma.sql`(p.code ILIKE ${like} OR p.name ILIKE ${like})`);
    }
    if (belowReorder) {
      conditions.push(Prisma.sql`bi.quantity < bi.reorder_point`);
    }
    const whereSql = Prisma.join(conditions, " AND ");

    const rows = await this.prisma.$queryRaw<RawRow[]>`
      SELECT bi.id,
             bi.branch_id AS "branchId",
             bi.product_id AS "productId",
             bi.quantity,
             bi.reserved_quantity AS "reservedQuantity",
             bi.reorder_point AS "reorderPoint",
             bi.updated_at AS "updatedAt",
             p.code AS "productCode",
             p.name AS "productName"
      FROM branch_inventory bi
      JOIN products p ON p.id = bi.product_id
      WHERE ${whereSql}
      ORDER BY p.name ASC
      LIMIT ${pageSize} OFFSET ${skip}
    `;

    const countResult = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM branch_inventory bi
      JOIN products p ON p.id = bi.product_id
      WHERE ${whereSql}
    `;

    return { items: rows.map(rawToView), total: Number(countResult[0]?.count ?? 0) };
  }

  async findByBranchAndProduct(branchId: string, productId: string): Promise<BranchInventoryView | null> {
    const row = await this.prisma.branchInventory.findUnique({
      where: { branchId_productId: { branchId, productId } },
      include: INCLUDE_PRODUCT,
    });
    return row ? toView(row) : null;
  }

  async create(data: CreateBranchInventoryData): Promise<BranchInventoryView> {
    try {
      const row = await this.prisma.branchInventory.create({
        data: {
          branchId: data.branchId,
          productId: data.productId,
          ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
          ...(data.reservedQuantity !== undefined ? { reservedQuantity: data.reservedQuantity } : {}),
          ...(data.reorderPoint !== undefined ? { reorderPoint: data.reorderPoint } : {}),
        },
        include: INCLUDE_PRODUCT,
      });
      return toView(row);
    } catch (err) {
      if (isUniqueError(err)) throw new BranchInventoryAlreadyExistsError();
      throw err;
    }
  }

  async update(id: string, data: UpdateBranchInventoryData): Promise<BranchInventoryView> {
    try {
      const row = await this.prisma.branchInventory.update({
        where: { id },
        data: {
          ...(data.quantity !== undefined ? { quantity: data.quantity } : {}),
          ...(data.reservedQuantity !== undefined ? { reservedQuantity: data.reservedQuantity } : {}),
          ...(data.reorderPoint !== undefined ? { reorderPoint: data.reorderPoint } : {}),
        },
        include: INCLUDE_PRODUCT,
      });
      return toView(row);
    } catch (err) {
      if (isNotFoundError(err)) throw new BranchInventoryRecordNotFoundError();
      throw err;
    }
  }

  async adjust(id: string, delta: number): Promise<BranchInventoryView> {
    const affected = await this.prisma.$executeRaw`
      UPDATE branch_inventory
      SET quantity = quantity + ${delta}::numeric, updated_at = NOW()
      WHERE id = ${id} AND quantity + ${delta}::numeric >= 0
    `;

    if (affected === 0) {
      const exists = await this.prisma.branchInventory.findUnique({ where: { id } });
      if (!exists) throw new BranchInventoryRecordNotFoundError();
      throw new NegativeStockNotAllowedError();
    }

    const row = await this.prisma.branchInventory.findUnique({ where: { id }, include: INCLUDE_PRODUCT });
    if (!row) throw new BranchInventoryRecordNotFoundError();
    return toView(row);
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.branchInventory.delete({ where: { id } });
    } catch (err) {
      if (isNotFoundError(err)) throw new BranchInventoryRecordNotFoundError();
      throw err;
    }
  }
}
