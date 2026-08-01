export type InventoryMovementType =
  | "sale"
  | "sale_cancel"
  | "sale_edit_restore"
  | "sale_edit_apply"
  | "return"
  | "return_cancel"
  | "adjustment_in"
  | "adjustment_out";

export type InventoryMovementDirection = "IN" | "OUT";

/** Spanish display labels for UI/PDF/xlsx — a static mapping, never persisted. */
export const MOVEMENT_TYPE_LABELS: Record<InventoryMovementType, string> = {
  sale: "Sal/Venta",
  sale_cancel: "Ent/Cancelación Venta",
  sale_edit_restore: "Ent/Edición (restituido)",
  sale_edit_apply: "Sal/Edición (aplicado)",
  return: "Ent/Devolución",
  return_cancel: "Sal/Cancelación Devolución",
  adjustment_in: "Ent/Ajuste",
  adjustment_out: "Sal/Ajuste",
};

export interface InventoryMovementProps {
  id: string;
  branchId: string;
  productId: string;
  movementAt: Date;
  sequence: number;
  movementType: InventoryMovementType;
  direction: InventoryMovementDirection;
  quantity: number;
  unit: string;
  balanceAfter: number;
  unitCost: number | null;
  unitPrice: number | null;
  customerId: string | null;
  providerId: string | null;
  folioId: string | null;
  folioCode: string | null;
  folioNumber: number | null;
  originFolioCode: string | null;
  originFolioNumber: number | null;
  sourceType: string;
  sourceId: string;
  status: string;
  notes: string | null;
  createdBy: string | null;
  createdAt: Date;
}

/** Read-only mapping of a persisted `inventory_movements` row — the ledger never mutates in place. */
export class InventoryMovement {
  readonly id: string;
  readonly branchId: string;
  readonly productId: string;
  readonly movementAt: Date;
  readonly sequence: number;
  readonly movementType: InventoryMovementType;
  readonly direction: InventoryMovementDirection;
  readonly quantity: number;
  readonly unit: string;
  readonly balanceAfter: number;
  readonly unitCost: number | null;
  readonly unitPrice: number | null;
  readonly customerId: string | null;
  readonly providerId: string | null;
  readonly folioId: string | null;
  readonly folioCode: string | null;
  readonly folioNumber: number | null;
  readonly originFolioCode: string | null;
  readonly originFolioNumber: number | null;
  readonly sourceType: string;
  readonly sourceId: string;
  readonly status: string;
  readonly notes: string | null;
  readonly createdBy: string | null;
  readonly createdAt: Date;

  private constructor(props: InventoryMovementProps) {
    this.id = props.id;
    this.branchId = props.branchId;
    this.productId = props.productId;
    this.movementAt = props.movementAt;
    this.sequence = props.sequence;
    this.movementType = props.movementType;
    this.direction = props.direction;
    this.quantity = props.quantity;
    this.unit = props.unit;
    this.balanceAfter = props.balanceAfter;
    this.unitCost = props.unitCost;
    this.unitPrice = props.unitPrice;
    this.customerId = props.customerId;
    this.providerId = props.providerId;
    this.folioId = props.folioId;
    this.folioCode = props.folioCode;
    this.folioNumber = props.folioNumber;
    this.originFolioCode = props.originFolioCode;
    this.originFolioNumber = props.originFolioNumber;
    this.sourceType = props.sourceType;
    this.sourceId = props.sourceId;
    this.status = props.status;
    this.notes = props.notes;
    this.createdBy = props.createdBy;
    this.createdAt = props.createdAt;
  }

  static create(props: InventoryMovementProps): InventoryMovement {
    return new InventoryMovement(props);
  }
}
