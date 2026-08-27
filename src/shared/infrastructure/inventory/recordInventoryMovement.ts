import { Prisma } from "@prisma/client";
import { shouldNotifyLowStock } from "@/shared/domain/services/checkAndNotifyLowStock";
import { resolveUnitDescriptions } from "@/shared/infrastructure/sat-codes/resolveUnitDescriptions";
import { BranchInventoryRowMissingError } from "@/shared/domain/errors/BranchInventoryRowMissingError";

type TxClient = Prisma.TransactionClient;

export type InventoryMovementType =
  | "sale"
  | "sale_cancel"
  | "sale_edit_restore"
  | "sale_edit_apply"
  | "return"
  | "return_cancel"
  | "adjustment_in"
  | "adjustment_out"
  | "purchase"
  | "purchase_cancel";

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
  sourceType: "sale" | "return" | "adjustment" | "purchase";
  sourceId: string;
  notes?: string | null;
  createdBy?: string | null;
  /** false → si no existe fila de branch_inventory, lanza BranchInventoryRowMissingError en vez de crearla. Default true. */
  allowRowCreation?: boolean;
}

export interface LowStockSignal {
  branchId: string;
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  reorderPoint: number;
}

export interface RecordInventoryMovementResult {
  balanceAfter: number;
  /** Non-null only when this OUT movement just crossed reorderPoint and the 24h debounce allows a new notification. */
  lowStockSignal: LowStockSignal | null;
}

/**
 * Applies `delta` to `branch_inventory.quantity` (creating the row if missing,
 * same fallback as the pre-ledger helpers) and inserts the matching
 * `inventory_movements` row in the same statement/transaction, using the
 * `RETURNING` clause so both effects share one round trip.
 *
 * For OUT movements, also evaluates the low-stock notification threshold
 * (`admin-notifications-api` "Notify admin on low stock") and, if it applies,
 * stamps `last_low_stock_notified_at` in the same transaction. The actual
 * email send is the caller's responsibility, performed AFTER the transaction
 * commits (see `AdminNotificationService`) — this function only decides
 * whether to notify and persists the debounce state.
 */
export async function recordInventoryMovement(
  tx: TxClient,
  data: RecordInventoryMovementData
): Promise<RecordInventoryMovementResult> {
  const delta = data.direction === "IN" ? data.quantity : -data.quantity;

  const rows = await tx.$queryRaw<
    { quantity: Prisma.Decimal; reorder_point: Prisma.Decimal; last_low_stock_notified_at: Date | null }[]
  >`
    UPDATE branch_inventory
    SET quantity = quantity + ${delta}::numeric, updated_at = NOW()
    WHERE branch_id = ${data.branchId} AND product_id = ${data.productId}
    RETURNING quantity, reorder_point, last_low_stock_notified_at
  `;

  let balanceAfter: number;
  let reorderPoint: number;
  let lastLowStockNotifiedAt: Date | null;
  if (rows.length === 0) {
    if (data.allowRowCreation === false) {
      throw new BranchInventoryRowMissingError(data.branchId, data.productId);
    }
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
    reorderPoint = created.reorderPoint.toNumber();
    lastLowStockNotifiedAt = null;
  } else {
    balanceAfter = rows[0].quantity.toNumber();
    reorderPoint = rows[0].reorder_point.toNumber();
    lastLowStockNotifiedAt = rows[0].last_low_stock_notified_at;
  }

  const product = await tx.product.findUnique({
    where: { id: data.productId },
    select: { unit: true, name: true, code: true },
  });
  const rawUnit = data.unit ?? product?.unit ?? "";
  const unitMap = await resolveUnitDescriptions(tx, [rawUnit]);
  const unit = unitMap.get(rawUnit) ?? rawUnit;

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

  let lowStockSignal: LowStockSignal | null = null;
  if (
    data.direction === "OUT" &&
    shouldNotifyLowStock(balanceAfter, reorderPoint, lastLowStockNotifiedAt)
  ) {
    await tx.$executeRaw`
      UPDATE branch_inventory
      SET last_low_stock_notified_at = NOW()
      WHERE branch_id = ${data.branchId} AND product_id = ${data.productId}
    `;
    lowStockSignal = {
      branchId: data.branchId,
      productId: data.productId,
      productName: product?.name ?? data.productId,
      productCode: product?.code ?? "",
      quantity: balanceAfter,
      reorderPoint,
    };
  }

  return { balanceAfter, lowStockSignal };
}
