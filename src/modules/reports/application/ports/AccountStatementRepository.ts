import {
  AccountStatementSummaryFilters,
  AccountStatementLedgerFilters,
} from "../../domain/value-objects/AccountStatementFilters";
import { RawAccountMovement } from "../../domain/value-objects/AccountMovement";

/** Fila agregada del resumen multi-cliente (valores numéricos crudos). */
export interface AccountSummaryRow {
  customerId: string;
  customerCode: string;
  customerName: string;
  /** Σ ventas a crédito vigentes (del rango, si hay). */
  totalCharged: number;
  /** Σ abonos completed (del rango, si hay). */
  totalPaid: number;
  /** Saldo vigente leído de `customers.current_balance` (fuente de verdad). */
  currentBalance: number;
  creditLimit: number | null;
}

export interface AccountSummaryResult {
  items: AccountSummaryRow[];
  total: number;
  page: number;
  pageSize: number;
}

/** Datos crudos del libro mayor de un cliente. */
export interface AccountLedgerData {
  customer: {
    id: string;
    code: string;
    name: string;
    currentBalance: number;
    creditLimit: number | null;
    address: string | null;
  };
  /** Serie + folio del último comprobante emitido; `null` si el cliente no tiene ventas. */
  lastInvoice: { serie: string; folioNumber: number } | null;
  /** Todos los movimientos del cliente (branch-scoped), sin filtrar por rango. */
  movements: RawAccountMovement[];
}

/** Datos crudos del recibo de un anticipo/abono. */
export interface AnticipoReceiptData {
  payment: {
    id: string;
    folioCode: string;
    folioNumber: number;
    amount: number;
    status: string;
    createdAt: Date;
    reference: string | null;
    paymentMethodCode: string;
    paymentMethodName: string;
  };
  customer: {
    code: string;
    name: string;
    address: string | null;
  };
  /** Comprobante fiscal al que se aplica el abono. */
  sale: { folioCode: string; folioNumber: number };
}

export interface AccountStatementRepository {
  summary(
    filters: AccountStatementSummaryFilters,
    pagination: { page: number; pageSize: number }
  ): Promise<AccountSummaryResult>;

  /** `null` cuando el cliente no existe. */
  ledger(
    customerId: string,
    filters: AccountStatementLedgerFilters
  ): Promise<AccountLedgerData | null>;

  /**
   * Recibo de un abono. `null` si el abono no existe, no pertenece al cliente,
   * o queda fuera del branch scope (`branchId` no nulo que no coincide).
   */
  anticipoReceipt(
    customerId: string,
    paymentId: string,
    branchId: string | null
  ): Promise<AnticipoReceiptData | null>;
}
