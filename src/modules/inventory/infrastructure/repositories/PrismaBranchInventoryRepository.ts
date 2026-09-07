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
import { recordInventoryMovement, type LowStockSignal } from "@/shared/infrastructure/inventory/recordInventoryMovement";
import { allocateFolio } from "@/shared/infrastructure/folios/allocateFolio";
import type { AdminNotificationService } from "@/shared/application/services/AdminNotificationService";
import {
  isPrismaUniqueError as isUniqueError,
  isPrismaNotFoundError as isNotFoundError,
} from "@/shared/infrastructure/prisma/errors";

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

export class PrismaBranchInventoryRepository implements BranchInventoryRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly notifier?: AdminNotificationService
  ) {}

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
      return await this.prisma.$transaction(async (tx) => {
        const row = await tx.branchInventory.create({
          data: {
            branchId: data.branchId,
            productId: data.productId,
            quantity: 0,
            ...(data.reservedQuantity !== undefined ? { reservedQuantity: data.reservedQuantity } : {}),
            ...(data.reorderPoint !== undefined ? { reorderPoint: data.reorderPoint } : {}),
          },
          include: INCLUDE_PRODUCT,
        });

        if (data.quantity !== undefined && data.quantity > 0) {
          await recordInventoryMovement(tx, {
            branchId: data.branchId,
            productId: data.productId,
            movementAt: new Date(),
            movementType: "adjustment_in",
            direction: "IN",
            quantity: data.quantity,
            sourceType: "adjustment",
            sourceId: row.id,
            notes: "Saldo inicial",
          });
        }

        const finalRow = await tx.branchInventory.findUniqueOrThrow({
          where: { id: row.id },
          include: INCLUDE_PRODUCT,
        });
        return toView(finalRow);
      });
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

  async adjust(id: string, delta: number, reason?: string | null): Promise<BranchInventoryView> {
    const { view, lowStockSignal, branchId } = await this.prisma.$transaction(async (tx) => {
      // Lock the row first (read-only) — the actual mutation happens once, either via
      // recordInventoryMovement (delta != 0) or a plain touch below (delta === 0), never both.
      const rows = await tx.$queryRaw<{ branchId: string; productId: string; quantity: Prisma.Decimal }[]>`
        SELECT branch_id AS "branchId", product_id AS "productId", quantity
        FROM branch_inventory WHERE id = ${id} FOR UPDATE
      `;
      const current = rows[0];
      if (!current) throw new BranchInventoryRecordNotFoundError();
      if (current.quantity.toNumber() + delta < 0) throw new NegativeStockNotAllowedError();

      let lowStockSignal: LowStockSignal | null = null;

      if (delta !== 0) {
        // Resolve the active INVENTORY-scope "TS" folio automatically; a missing/inactive
        // folio must not block a critical stock adjustment (see design.md).
        const folio = await tx.folio.findFirst({ where: { code: "TS", scope: "INVENTORY", isActive: true } });
        const allocated = folio ? await allocateFolio(tx, folio.id) : null;

        const result = await recordInventoryMovement(tx, {
          branchId: current.branchId,
          productId: current.productId,
          movementAt: new Date(),
          movementType: delta > 0 ? "adjustment_in" : "adjustment_out",
          direction: delta > 0 ? "IN" : "OUT",
          quantity: Math.abs(delta),
          folioId: folio?.id ?? null,
          folioCode: allocated?.folioCode ?? null,
          folioNumber: allocated?.folioNumber ?? null,
          sourceType: "adjustment",
          sourceId: id,
          notes: reason ?? null,
        });
        lowStockSignal = result.lowStockSignal;
      } else {
        await tx.$executeRaw`UPDATE branch_inventory SET updated_at = NOW() WHERE id = ${id}`;
      }

      const row = await tx.branchInventory.findUnique({ where: { id }, include: INCLUDE_PRODUCT });
      if (!row) throw new BranchInventoryRecordNotFoundError();
      return { view: toView(row), lowStockSignal, branchId: current.branchId };
    });

    if (lowStockSignal && this.notifier) {
      const branch = await this.prisma.branch.findUnique({ where: { id: branchId }, select: { name: true } });
      await this.notifier.notifyLowStock({
        productName: lowStockSignal.productName,
        productCode: lowStockSignal.productCode,
        branchName: branch?.name ?? branchId,
        quantity: lowStockSignal.quantity,
        reorderPoint: lowStockSignal.reorderPoint,
      });
    }

    return view;
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
