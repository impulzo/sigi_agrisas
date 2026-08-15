import { InventoryMovement } from "../entities/InventoryMovement";
import { roundHalfToEven } from "@/shared/domain/services/roundHalfToEven";

export interface BranchBalanceSummary {
  branchId: string;
  /** Last `balanceAfter` strictly before `from` for this branch+product; 0 if none. */
  balanceBeforeRange: number;
  /** Last `balanceAfter` within [from, to] for this branch+product; null if no movements in range. */
  lastBalanceInRange: number | null;
  /** Current `branch_inventory.quantity` for this branch+product. */
  currentQuantity: number;
}

export interface KardexHeader {
  existenciaTotal: number;
  existenciaAlmacen: number;
  saldoAnterior: number;
  saldoFinal: number;
}

export interface KardexMovementRow {
  movementAt: Date;
  branchId: string;
  movementType: InventoryMovement["movementType"];
  entrada: number;
  salida: number;
  saldo: number;
  unit: string;
  /** Unit conversion factor from the original ticket's column list — not modeled anywhere in this repo (no dosification concept applies to the ledger); fixed at 1. */
  factor: number;
  /** "Serie" from the original ticket's column list — no concept of document series exists in this system; always null. */
  serie: string | null;
  unitCost: number | null;
  unitPrice: number | null;
  folioCode: string | null;
  folioNumber: number | null;
  originFolioCode: string | null;
  originFolioNumber: number | null;
  customerId: string | null;
  providerId: string | null;
  status: string;
  notes: string | null;
}

export interface KardexAssemblerInput {
  /** null means "todos" — movements/balances span every branch in the caller's scope. */
  branchId: string | null;
  /** Movements already filtered to [from, to] and to `branchId` when set. Any order. */
  movements: InventoryMovement[];
  /** One entry per branch in scope — a single entry when `branchId` is set. */
  branchBalances: BranchBalanceSummary[];
}

const SCALE = 4;

export class KardexAssembler {
  static assemble(input: KardexAssemblerInput): { header: KardexHeader; movements: KardexMovementRow[] } {
    const sorted = [...input.movements].sort((a, b) => {
      const byDate = a.movementAt.getTime() - b.movementAt.getTime();
      if (byDate !== 0) return byDate;
      return a.sequence - b.sequence;
    });

    const movements: KardexMovementRow[] = sorted.map((m) => ({
      movementAt: m.movementAt,
      branchId: m.branchId,
      movementType: m.movementType,
      entrada: m.direction === "IN" ? m.quantity : 0,
      salida: m.direction === "OUT" ? m.quantity : 0,
      saldo: m.balanceAfter,
      unit: m.unit,
      factor: 1,
      serie: null,
      unitCost: m.unitCost,
      unitPrice: m.unitPrice,
      folioCode: m.folioCode,
      folioNumber: m.folioNumber,
      originFolioCode: m.originFolioCode,
      originFolioNumber: m.originFolioNumber,
      customerId: m.customerId,
      providerId: m.providerId,
      status: m.status,
      notes: m.notes,
    }));

    let saldoAnterior = 0;
    let saldoFinal = 0;
    let existencia = 0;
    for (const b of input.branchBalances) {
      saldoAnterior = roundHalfToEven(saldoAnterior + b.balanceBeforeRange, SCALE);
      saldoFinal = roundHalfToEven(saldoFinal + (b.lastBalanceInRange ?? b.balanceBeforeRange), SCALE);
      existencia = roundHalfToEven(existencia + b.currentQuantity, SCALE);
    }

    return {
      header: {
        existenciaTotal: existencia,
        existenciaAlmacen: existencia,
        saldoAnterior,
        saldoFinal,
      },
      movements,
    };
  }
}
