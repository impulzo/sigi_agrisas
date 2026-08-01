import { Decimal } from "decimal.js";
import {
  AccountMovement,
  AccountMovementType,
  RawAccountMovement,
} from "../value-objects/AccountMovement";

/**
 * Servicio de dominio puro (sin I/O) que reconstruye el libro mayor de un
 * cliente: ordena los movimientos cronológicamente y calcula el saldo corrido.
 *
 * Reglas de negocio (ver design.md / spec account-statements-api):
 * - `runningBalance` solo lo mueven las ventas a CRÉDITO no canceladas
 *   (débito +) y los abonos `completed` (crédito −).
 * - Las ventas de CONTADO aparecen marcadas (`type='sale_cash'`) pero con
 *   `debit=0`/`credit=0`: no alteran el saldo.
 * - Los movimientos `cancelled` aparecen con `debit=0`/`credit=0`: no alteran
 *   el saldo (el `current_balance` ya los excluye).
 * - Orden: por fecha ascendente; en empate, ventas antes que abonos.
 * - Aritmética con decimal.js a 4 decimales (escala `Decimal(14,4)`).
 */
export class AccountLedgerBuilder {
  static classify(m: RawAccountMovement): AccountMovementType {
    if (m.kind === "sale") return m.isCredit ? "sale_credit" : "sale_cash";
    return "payment";
  }

  /**
   * @param movements Movimientos crudos del cliente.
   * @param openingBalance Saldo inicial (movimientos previos al rango). 0 si histórico completo.
   */
  static build(movements: RawAccountMovement[], openingBalance = 0): AccountMovement[] {
    const sorted = [...movements].sort((a, b) => {
      const dt = a.date.getTime() - b.date.getTime();
      if (dt !== 0) return dt;
      // Ventas antes que abonos en el mismo instante.
      if (a.kind !== b.kind) return a.kind === "sale" ? -1 : 1;
      return 0;
    });

    let running = new Decimal(openingBalance);
    const result: AccountMovement[] = [];

    for (const m of sorted) {
      const type = this.classify(m);
      const amount = new Decimal(m.amount);

      const isDebit = type === "sale_credit" && m.status !== "cancelled";
      const isCredit = type === "payment" && m.status === "completed";

      const debit = isDebit ? amount : new Decimal(0);
      const credit = isCredit ? amount : new Decimal(0);

      running = running.plus(debit).minus(credit);

      result.push({
        ...m,
        type,
        debit: debit.toDecimalPlaces(4, Decimal.ROUND_HALF_EVEN).toNumber(),
        credit: credit.toDecimalPlaces(4, Decimal.ROUND_HALF_EVEN).toNumber(),
        runningBalance: running.toDecimalPlaces(4, Decimal.ROUND_HALF_EVEN).toNumber(),
      });
    }

    return result;
  }

  /** Saldo final tras aplicar todos los movimientos a `openingBalance`. */
  static closingBalance(movements: RawAccountMovement[], openingBalance = 0): number {
    const built = this.build(movements, openingBalance);
    if (built.length === 0) {
      return new Decimal(openingBalance).toDecimalPlaces(4, Decimal.ROUND_HALF_EVEN).toNumber();
    }
    return built[built.length - 1].runningBalance;
  }
}
