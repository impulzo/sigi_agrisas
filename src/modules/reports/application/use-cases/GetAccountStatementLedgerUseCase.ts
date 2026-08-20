import { Decimal } from "decimal.js";
import { AccountStatementRepository } from "../ports/AccountStatementRepository";
import { AccountLedgerBuilder } from "../../domain/services/AccountLedgerBuilder";
import { groupLedgerBySale } from "../../domain/services/LedgerGrouper";
import {
  RawAccountMovement,
  AccountMovement,
  LedgerSort,
} from "../../domain/value-objects/AccountMovement";
import { StatementCustomerNotFoundError } from "../../domain/errors/StatementCustomerNotFoundError";
import {
  AccountStatementLedgerResponseDto,
  AccountStatementMovementDto,
  AccountStatementLedgerGroupDto,
} from "../dto/AccountStatementLedgerResponseDto";

export interface GetAccountStatementLedgerRequest {
  customerId: string;
  branchId: string | null;
  from: Date | null;
  to: Date | null;
  /** `true` (Histórico, default): todos los movimientos. `false` (General): solo deudas activas. */
  history: boolean;
  /** Orden de presentación; no altera el `runningBalance` cronológico. */
  sort: LedgerSort;
  generatedBy: { userId: string; email: string };
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

/**
 * Filtro "General": solo ventas a crédito con deuda viva (`paymentStatus != 'paid'`,
 * no canceladas) y los abonos ligados a esas ventas. No altera la aritmética del saldo.
 */
function filterActive(movements: AccountMovement[]): AccountMovement[] {
  const activeSaleIds = new Set(
    movements
      .filter(
        (m) =>
          m.type === "sale_credit" &&
          m.status !== "cancelled" &&
          m.paymentStatus !== "paid"
      )
      .map((m) => m.id)
  );
  return movements.filter((m) =>
    m.kind === "sale"
      ? activeSaleIds.has(m.id)
      : m.saleId !== null && activeSaleIds.has(m.saleId)
  );
}

/** Reordena para presentación (no toca `runningBalance`). `date` conserva el orden cronológico. */
function applySort(movements: AccountMovement[], sort: LedgerSort): AccountMovement[] {
  if (sort === "date") return movements;
  const byInvoice = (a: AccountMovement, b: AccountMovement) =>
    a.folioNumber - b.folioNumber ||
    a.folioCode.localeCompare(b.folioCode) ||
    a.date.getTime() - b.date.getTime();
  const bySerie = (a: AccountMovement, b: AccountMovement) =>
    a.folioCode.localeCompare(b.folioCode) ||
    a.folioNumber - b.folioNumber ||
    a.date.getTime() - b.date.getTime();
  return [...movements].sort(sort === "invoice" ? byInvoice : bySerie);
}

function toMovementDto(m: AccountMovement): AccountStatementMovementDto {
  return {
    id: m.id,
    date: m.date.toISOString(),
    type: m.type,
    folioCode: m.folioCode,
    folioNumber: m.folioNumber,
    folio: `${m.folioCode}-${m.folioNumber}`,
    serie: m.folioCode,
    factura: m.folioNumber,
    dueDate: m.dueDate ? m.dueDate.toISOString() : null,
    reference: m.reference,
    paymentMethodCode: m.paymentMethodCode,
    debit: new Decimal(m.debit).toFixed(4),
    credit: new Decimal(m.credit).toFixed(4),
    runningBalance: new Decimal(m.runningBalance).toFixed(4),
    status: m.status,
  };
}

export class GetAccountStatementLedgerUseCase {
  constructor(private readonly repo: AccountStatementRepository) {}

  async execute(
    req: GetAccountStatementLedgerRequest
  ): Promise<AccountStatementLedgerResponseDto> {
    const data = await this.repo.ledger(req.customerId, {
      branchId: req.branchId,
      from: req.from,
      to: req.to,
    });

    if (!data) throw new StatementCustomerNotFoundError(req.customerId);

    // Split: movimientos previos al rango (opening) vs. dentro del rango (listados).
    const toBoundary = req.to ? endOfDay(req.to) : null;
    const before: RawAccountMovement[] = [];
    const inRange: RawAccountMovement[] = [];

    for (const m of data.movements) {
      if (req.from && m.date < req.from) {
        before.push(m);
        continue;
      }
      if (toBoundary && m.date > toBoundary) continue;
      inRange.push(m);
    }

    const openingBalance = req.from
      ? AccountLedgerBuilder.closingBalance(before, data.customer.initialBalance)
      : data.customer.initialBalance;
    // Saldo corrido cronológico (universo completo del rango). No lo altera history/sort.
    const built = AccountLedgerBuilder.build(inRange, openingBalance);

    const closingBalance =
      built.length > 0 ? built[built.length - 1].runningBalance : openingBalance;

    // General (history=false): solo deudas activas. Histórico (default): todo.
    const visible = req.history ? built : filterActive(built);
    // Orden de presentación (no toca runningBalance).
    const ordered = applySort(visible, req.sort);

    let totalDebit = new Decimal(0);
    let totalCredit = new Decimal(0);
    const movements: AccountStatementMovementDto[] = ordered.map((m) => {
      totalDebit = totalDebit.plus(m.debit);
      totalCredit = totalCredit.plus(m.credit);
      return toMovementDto(m);
    });

    const groups: AccountStatementLedgerGroupDto[] = groupLedgerBySale(visible, req.sort).map(
      (g) => ({
        sale: g.sale ? toMovementDto(g.sale) : null,
        payments: g.payments.map(toMovementDto),
        ticketBalance: new Decimal(g.sale?.debit ?? 0)
          .minus(g.payments.reduce((sum, p) => sum.plus(p.credit), new Decimal(0)))
          .toFixed(4),
      })
    );

    const creditLimit = data.customer.creditLimit;
    const availableCredit =
      creditLimit === null
        ? null
        : new Decimal(creditLimit).minus(data.customer.currentBalance).toFixed(4);

    return {
      generatedAt: new Date().toISOString(),
      generatedBy: req.generatedBy,
      customer: {
        id: data.customer.id,
        code: data.customer.code,
        name: data.customer.name,
        currentBalance: new Decimal(data.customer.currentBalance).toFixed(4),
        creditLimit: creditLimit === null ? null : new Decimal(creditLimit).toFixed(4),
        availableCredit,
        address: data.customer.address,
      },
      lastInvoice: data.lastInvoice,
      filters: {
        branchId: req.branchId,
        from: req.from ? req.from.toISOString().split("T")[0] : null,
        to: req.to ? req.to.toISOString().split("T")[0] : null,
      },
      openingBalance: new Decimal(openingBalance).toFixed(4),
      closingBalance: new Decimal(closingBalance).toFixed(4),
      movements,
      groups,
      totals: {
        movementCount: movements.length,
        totalDebit: totalDebit.toFixed(4),
        totalCredit: totalCredit.toFixed(4),
      },
    };
  }
}
