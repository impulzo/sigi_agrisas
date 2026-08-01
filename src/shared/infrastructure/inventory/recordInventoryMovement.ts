import { Prisma } from "@prisma/client";

type TxClient = Prisma.TransactionClient;

export type InventoryMovementType =
  | "sale"
  | "sale_cancel"
  | "sale_edit_restore"
  | "sale_edit_apply"
  | "return"
  | "return_cancel"
  | "adjustment_in"
  | "adjustment_out";

export interface RecordInventoryMovementData {
  branchId: string;
  productId: string;
  movementAt: Date;
  movementType: InventoryMovementType;
  direction: "IN" | "OUT";
  /** Magnitude, always positive — `direction` decides the sign applied to `branch_inventory.quantity`. */
  quantity: number;
  /** Product unit label (e.g. "PZA"); looked up from `products.unit` when omitted. */
  unit?: string;
  unitCost?: number | null;
  unitPrice?: number | null;
  customerId?: string | null;
  providerId?: string | null;
  folioId?: string | null;
  folioCode?: string | null;
  folioNumber?: number | null;
  originFolioCode?: string | null;
  originFolioNumber?: number | null;
  sourceType: "sale" | "return" | "adjustment";
  sourceId: string;
  notes?: string | null;
  createdBy?: string | null;
}

/**
 * Applies `delta` to `branch_inventory.quantity` (creating the row if missing,
 * same fallback as the pre-ledger helpers) and inserts the matching
 * `inventory_movements` row in the same statement/transaction, using the
 * `RETURNING` clause so both effects share one round trip.
 */
export async function recordInventoryMovement(
  tx: TxClient,
  data: RecordInventoryMovementData
): Promise<{ balanceAfter: number }> {
  const delta = data.direction === "IN" ? data.quantity : -data.quantity;

  const rows = await tx.$queryRaw<{ quantity: Prisma.Decimal }[]>`
    UPDATE branch_inventory
    SET quantity = quantity + ${delta}::numeric, updated_at = NOW()
    WHERE branch_id = ${data.branchId} AND product_id = ${data.productId}
    RETURNING quantity
  `;

  let balanceAfter: number;
  if (rows.length === 0) {
    const created = await tx.branchInventory.create({
      data: {
        branchId: data.branchId,
        productId: data.productId,
        quantity: new Prisma.Decimal(delta),
        reservedQuantity: new Prisma.Decimal(0),
        reorderPoint: new Prisma.Decimal(0),
      },
    });
    balanceAfter = created.quantity.toNumber();
  } else {
    balanceAfter = rows[0].quantity.toNumber();
  }

  const unit =
    data.unit ??
    (await tx.product.findUnique({ where: { id: data.productId }, select: { unit: true } }))?.unit ??
    "";

  await tx.inventoryMovement.create({
    data: {
      branchId: data.branchId,
      productId: data.productId,
      movementAt: data.movementAt,
      movementType: data.movementType,
      direction: data.direction,
      quantity: new Prisma.Decimal(data.quantity),
      unit: unit.slice(0, 10),
      balanceAfter: new Prisma.Decimal(balanceAfter),
      unitCost: data.unitCost != null ? new Prisma.Decimal(data.unitCost) : null,
      unitPrice: data.unitPrice != null ? new Prisma.Decimal(data.unitPrice) : null,
      customerId: data.customerId ?? null,
      providerId: data.providerId ?? null,
      folioId: data.folioId ?? null,
      folioCode: data.folioCode ?? null,
      folioNumber: data.folioNumber ?? null,
      originFolioCode: data.originFolioCode ?? null,
      originFolioNumber: data.originFolioNumber ?? null,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      notes: data.notes ?? null,
      createdBy: data.createdBy ?? null,
    },
  });

  return { balanceAfter };
}
