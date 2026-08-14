import { PrismaClient, Prisma } from "@prisma/client";
import { InventoryLotRepository, NearestExpirationLot } from "../../application/ports/InventoryLotRepository";

interface RawRow {
  product_id: string;
  lot_number: string;
  expiration_date: Date;
}

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
}
