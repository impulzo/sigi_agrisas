/**
 * Movimientos crudos del estado de cuenta de un cliente, tal como los devuelve
 * el repositorio antes de calcular el saldo corrido.
 *
 * - `kind='sale'`: una venta. `isCredit` viene de `payment_method.is_credit`.
 *   `status` es el estado de la venta (`completed` | `cancelled` | `edited`).
 * - `kind='payment'`: un abono. `isCredit` no aplica (siempre `false`).
 *   `status` es `completed` | `cancelled`.
 */
export interface RawAccountMovement {
  id: string;
  kind: "sale" | "payment";
  isCredit: boolean;
  status: string;
  amount: number;
  date: Date;
  folioCode: string;
  folioNumber: number;
  branchId: string;
  /** Fecha de vencimiento (`sales.due_date`). `null` para contado, abonos o ventas sin plazo. */
  dueDate: Date | null;
  /** Referencia libre: `customer_payments.notes` para abonos; `null` para ventas. */
  reference: string | null;
  /** Forma de pago (`payment_methods.code`, ej. `TR`). `null` si no aplica. */
  paymentMethodCode: string | null;
  /** Estado de pago de la venta (`sales.payment_status`). `null` para abonos. */
  paymentStatus: string | null;
  /** Venta a la que pertenece un abono (`customer_payments.sale_id`). `null` para ventas. */
  saleId: string | null;
}

export type AccountMovementType = "sale_credit" | "sale_cash" | "payment";

/**
 * Movimiento enriquecido por `AccountLedgerBuilder`: clasificado por `type`,
 * con `debit`/`credit` (solo crédito y abonos completed mueven el saldo) y el
 * `runningBalance` acumulado.
 */
export interface AccountMovement extends RawAccountMovement {
  type: AccountMovementType;
  debit: number;
  credit: number;
  runningBalance: number;
}
