import { PrismaClient, Prisma } from "@prisma/client";
import { InventoryLotRepository, NearestExpirationLot } from "../../application/ports/InventoryLotRepository";
import type {
  ExpiryNotificationThreshold,
  InventoryLotExpirySnapshot,
} from "../../domain/services/InventoryLotExpiryNotificationPolicy";

interface RawRow {
  product_id: string;
  lot_number: string;
  expiration_date: Date;
}

interface PendingExpiryRawRow {
  id: string;
  expiration_date: Date;
  notified_six_months_at: Date | null;
  notified_three_months_at: Date | null;
  notified_day_of_at: Date | null;
  product_name: string;
  branch_name: string;
  lot_number: string;
  quantity: Prisma.Decimal;
}

const THRESHOLD_COLUMN: Record<ExpiryNotificationThreshold, string> = {
  sixMonths: "notified_six_months_at",
  threeMonths: "notified_three_months_at",
  dayOf: "notified_day_of_at",
};

export class PrismaInventoryLotRepository implements InventoryLotRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findNearestExpirationByProducts(
    branchId: string,
    productIds: string[]
  ): Promise<Map<string, NearestExpirationLot>> {
    if (productIds.length === 0) return new Map();

    const rows = await this.prisma.$queryRaw<RawRow[]>`
      SELECT DISTINCT ON (product_id) product_id, lot_number, expiration_date
      FROM inventory_lots
      WHERE branch_id = ${branchId} AND product_id IN (${Prisma.join(productIds)})
      ORDER BY product_id, expiration_date ASC
    `;

    const result = new Map<string, NearestExpirationLot>();
    for (const row of rows) {
      result.set(row.product_id, { expirationDate: row.expiration_date, lotNumber: row.lot_number });
    }
    return result;
  }

  async findPendingExpiryNotificationLots(): Promise<InventoryLotExpirySnapshot[]> {
    const rows = await this.prisma.$queryRaw<PendingExpiryRawRow[]>`
      SELECT
        il.id,
        il.expiration_date,
        il.notified_six_months_at,
        il.notified_three_months_at,
        il.notified_day_of_at,
        il.lot_number,
        il.quantity,
        p.name AS product_name,
        b.name AS branch_name
      FROM inventory_lots il
      JOIN products p ON p.id = il.product_id
      JOIN branches b ON b.id = il.branch_id
      WHERE il.notified_day_of_at IS NULL
    `;

    return rows.map((row) => ({
      id: row.id,
      expirationDate: row.expiration_date,
      notifiedSixMonthsAt: row.notified_six_months_at,
      notifiedThreeMonthsAt: row.notified_three_months_at,
      notifiedDayOfAt: row.notified_day_of_at,
      productName: row.product_name,
      branchName: row.branch_name,
      lotNumber: row.lot_number,
      quantity: row.quantity.toNumber(),
    }));
  }

  async markLotNotified(lotId: string, threshold: ExpiryNotificationThreshold): Promise<void> {
    const column = THRESHOLD_COLUMN[threshold];
    await this.prisma.$executeRaw`UPDATE inventory_lots SET ${Prisma.raw(column)} = NOW() WHERE id = ${lotId}`;
  }
}
