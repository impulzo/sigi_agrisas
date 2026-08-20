import {
  AccountStatementRepository,
  AccountSummaryResult,
  AccountLedgerData,
  AnticipoReceiptData,
} from "../../application/ports/AccountStatementRepository";
import {
  AccountStatementSummaryFilters,
  AccountStatementLedgerFilters,
} from "../../domain/value-objects/AccountStatementFilters";
import { RawAccountMovement } from "../../domain/value-objects/AccountMovement";

export interface InMemoryStatementCustomer {
  id: string;
  code: string;
  name: string;
  currentBalance: number;
  initialBalance?: number;
  creditLimit: number | null;
  address?: string | null;
}

export type InMemoryStatementMovement = RawAccountMovement & { customerId: string };

/** Recibo sembrado para tests: incluye `customerId` y `branchId` para el matching. */
export type InMemoryAnticipoReceipt = AnticipoReceiptData & {
  paymentId: string;
  customerId: string;
  branchId: string;
};

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function inRange(date: Date, from: Date | null, to: Date | null): boolean {
  if (from && date < from) return false;
  if (to && date > endOfDay(to)) return false;
  return true;
}

export class InMemoryAccountStatementRepository implements AccountStatementRepository {
  constructor(
    private readonly customers: InMemoryStatementCustomer[],
    private readonly movements: InMemoryStatementMovement[],
    private readonly receipts: InMemoryAnticipoReceipt[] = []
  ) {}

  async summary(
    filters: AccountStatementSummaryFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<AccountSummaryResult> {
    let filtered = [...this.customers];

    if (filters.onlyWithBalance) {
      filtered = filtered.filter((c) => c.currentBalance !== 0);
    }
    if (filters.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
      );
    }

    filtered.sort((a, b) => a.name.localeCompare(b.name));

    const total = filtered.length;
    const start = (pagination.page - 1) * pagination.pageSize;
    const page = filtered.slice(start, start + pagination.pageSize);

    const items = page.map((c) => {
      const mine = this.movements.filter((m) => {
        if (m.customerId !== c.id) return false;
        if (filters.branchId && m.branchId !== filters.branchId) return false;
        return inRange(m.date, filters.from, filters.to);
      });

      const totalCharged = mine
        .filter((m) => m.kind === "sale" && m.isCredit && m.status !== "cancelled")
        .reduce((sum, m) => sum + m.amount, 0);
      const totalPaid = mine
        .filter((m) => m.kind === "payment" && m.status === "completed")
        .reduce((sum, m) => sum + m.amount, 0);

      return {
        customerId: c.id,
        customerCode: c.code,
        customerName: c.name,
        totalCharged,
        totalPaid,
        currentBalance: c.currentBalance,
        initialBalance: c.initialBalance ?? 0,
        creditLimit: c.creditLimit,
      };
    });

    return { items, total, page: pagination.page, pageSize: pagination.pageSize };
  }

  async ledger(
    customerId: string,
    filters: AccountStatementLedgerFilters
  ): Promise<AccountLedgerData | null> {
    const customer = this.customers.find((c) => c.id === customerId);
    if (!customer) return null;

    const mine = this.movements
      .filter((m) => m.customerId === customerId)
      .filter((m) => !filters.branchId || m.branchId === filters.branchId);

    const movements: RawAccountMovement[] = mine.map(
      ({ customerId: _omit, ...rest }) => rest
    );

    // Última factura: venta más reciente por fecha (branch-scoped).
    const sales = mine
      .filter((m) => m.kind === "sale")
      .sort((a, b) => b.date.getTime() - a.date.getTime());
    const lastInvoice =
      sales.length > 0
        ? { serie: sales[0].folioCode, folioNumber: sales[0].folioNumber }
        : null;

    return {
      customer: {
        id: customer.id,
        code: customer.code,
        name: customer.name,
        currentBalance: customer.currentBalance,
        initialBalance: customer.initialBalance ?? 0,
        creditLimit: customer.creditLimit,
        address: customer.address ?? null,
      },
      lastInvoice,
      movements,
    };
  }

  async anticipoReceipt(
    customerId: string,
    paymentId: string,
    branchId: string | null
  ): Promise<AnticipoReceiptData | null> {
    const r = this.receipts.find(
      (x) =>
        x.paymentId === paymentId &&
        x.customerId === customerId &&
        (!branchId || x.branchId === branchId)
    );
    if (!r) return null;
    return { payment: r.payment, customer: r.customer, sale: r.sale };
  }
}
