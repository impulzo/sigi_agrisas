import { PrismaClient, Prisma } from "@prisma/client";
import {
  InventoryMovement,
  InventoryMovementType,
  InventoryMovementDirection,
} from "../../domain/entities/InventoryMovement";
import {
  InventoryMovementRepository,
  RebuildInventoryArticleResult,
} from "../../application/ports/InventoryMovementRepository";
import { BranchBalanceSummary } from "../../domain/services/KardexAssembler";

type MovementRow = {
  id: string;
  branch_id: string;
  product_id: string;
  movement_at: Date;
  sequence: bigint;
  movement_type: string;
  direction: string;
  quantity: Prisma.Decimal;
  unit: string;
  balance_after: Prisma.Decimal;
  unit_cost: Prisma.Decimal | null;
  unit_price: Prisma.Decimal | null;
  customer_id: string | null;
  provider_id: string | null;
  folio_id: string | null;
  folio_code: string | null;
  folio_number: number | null;
  origin_folio_code: string | null;
  origin_folio_number: number | null;
  source_type: string;
  source_id: string;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: Date;
};

function toDomain(row: MovementRow): InventoryMovement {
  return InventoryMovement.create({
    id: row.id,
    branchId: row.branch_id,
    productId: row.product_id,
    movementAt: row.movement_at,
    sequence: Number(row.sequence),
    movementType: row.movement_type as InventoryMovementType,
    direction: row.direction as InventoryMovementDirection,
    quantity: Number(row.quantity),
    unit: row.unit,
    balanceAfter: Number(row.balance_after),
    unitCost: row.unit_cost !== null ? Number(row.unit_cost) : null,
    unitPrice: row.unit_price !== null ? Number(row.unit_price) : null,
    customerId: row.customer_id,
    providerId: row.provider_id,
    folioId: row.folio_id,
    folioCode: row.folio_code,
    folioNumber: row.folio_number,
    originFolioCode: row.origin_folio_code,
    originFolioNumber: row.origin_folio_number,
    sourceType: row.source_type,
    sourceId: row.source_id,
    status: row.status,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
  });
}

export class PrismaInventoryMovementRepository implements InventoryMovementRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findMovementsInRange(
    productId: string,
    branchId: string | null,
    from: Date,
    to: Date
  ): Promise<InventoryMovement[]> {
    const conditions: Prisma.Sql[] = [
      Prisma.sql`product_id = ${productId}`,
      Prisma.sql`movement_at >= ${from}`,
      Prisma.sql`movement_at <= ${to}`,
    ];
    if (branchId) conditions.push(Prisma.sql`branch_id = ${branchId}`);
    const where = Prisma.join(conditions, " AND ");

    const rows = await this.prisma.$queryRaw<MovementRow[]>`
      SELECT * FROM inventory_movements
      WHERE ${where}
      ORDER BY movement_at ASC, sequence ASC
    `;
    return rows.map(toDomain);
  }

  async getBranchBalances(
    productId: string,
    branchId: string | null,
    from: Date,
    to: Date
  ): Promise<BranchBalanceSummary[]> {
    const biFilter = branchId ? Prisma.sql`AND branch_id = ${branchId}` : Prisma.empty;
    const invFilter = branchId ? Prisma.sql`AND branch_id = ${branchId}` : Prisma.empty;

    const branchRows = await this.prisma.$queryRaw<{ branch_id: string }[]>`
      SELECT DISTINCT branch_id FROM (
        SELECT branch_id FROM branch_inventory WHERE product_id = ${productId} ${biFilter}
        UNION
        SELECT branch_id FROM inventory_movements WHERE product_id = ${productId} ${invFilter}
      ) t
    `;
    const branchIds = branchRows.map((r) => r.branch_id);
    if (branchIds.length === 0) return [];

    const [beforeRows, inRangeRows, currentRows] = await Promise.all([
      this.prisma.$queryRaw<{ branch_id: string; balance_after: Prisma.Decimal }[]>`
        SELECT DISTINCT ON (branch_id) branch_id, balance_after
        FROM inventory_movements
        WHERE product_id = ${productId} AND movement_at < ${from} AND branch_id = ANY(${branchIds}::text[])
        ORDER BY branch_id, movement_at DESC, sequence DESC
      `,
      this.prisma.$queryRaw<{ branch_id: string; balance_after: Prisma.Decimal }[]>`
        SELECT DISTINCT ON (branch_id) branch_id, balance_after
        FROM inventory_movements
        WHERE product_id = ${productId} AND movement_at >= ${from} AND movement_at <= ${to}
          AND branch_id = ANY(${branchIds}::text[])
        ORDER BY branch_id, movement_at DESC, sequence DESC
      `,
      this.prisma.$queryRaw<{ branch_id: string; quantity: Prisma.Decimal }[]>`
        SELECT branch_id, quantity FROM branch_inventory
        WHERE product_id = ${productId} AND branch_id = ANY(${branchIds}::text[])
      `,
    ]);

    const beforeMap = new Map(beforeRows.map((r) => [r.branch_id, Number(r.balance_after)]));
    const inRangeMap = new Map(inRangeRows.map((r) => [r.branch_id, Number(r.balance_after)]));
    const currentMap = new Map(currentRows.map((r) => [r.branch_id, Number(r.quantity)]));

    return branchIds.map((b) => ({
      branchId: b,
      balanceBeforeRange: beforeMap.get(b) ?? 0,
      lastBalanceInRange: inRangeMap.has(b) ? (inRangeMap.get(b) as number) : null,
      currentQuantity: currentMap.get(b) ?? 0,
    }));
  }

  async rebuild(productId: string, branchId: string): Promise<RebuildInventoryArticleResult> {
    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<MovementRow[]>`
        SELECT * FROM inventory_movements
        WHERE product_id = ${productId} AND branch_id = ${branchId}
        ORDER BY movement_at ASC, sequence ASC
        FOR UPDATE
      `;

      const currentRow = await tx.branchInventory.findUnique({
        where: { branchId_productId: { branchId, productId } },
        select: { quantity: true },
      });
      const previousQuantity = currentRow ? currentRow.quantity.toNumber() : 0;

      let running = 0;
      for (const row of rows) {
        const qty = Number(row.quantity);
        running += row.direction === "IN" ? qty : -qty;
        await tx.$executeRaw`
          UPDATE inventory_movements SET balance_after = ${running}::numeric WHERE id = ${row.id}
        `;
      }

      if (currentRow) {
        await tx.branchInventory.update({
          where: { branchId_productId: { branchId, productId } },
          data: { quantity: new Prisma.Decimal(running) },
        });
      } else if (rows.length > 0) {
        await tx.branchInventory.create({
          data: {
            branchId,
            productId,
            quantity: new Prisma.Decimal(running),
            reservedQuantity: new Prisma.Decimal(0),
            reorderPoint: new Prisma.Decimal(0),
          },
        });
      }

      return { movementsRebuilt: rows.length, previousQuantity, newQuantity: running };
    });
  }
}
