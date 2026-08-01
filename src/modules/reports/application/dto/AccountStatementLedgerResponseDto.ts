import { AccountMovementType } from "../../domain/value-objects/AccountMovement";

export interface AccountStatementMovementDto {
  id: string;
  date: string;
  type: AccountMovementType;
  folioCode: string;
  folioNumber: number;
  folio: string;
  /** Serie del comprobante (= folioCode). */
  serie: string;
  /** Folio del comprobante (= folioNumber). */
  factura: number;
  /** Fecha de vencimiento ISO; `null` para contado/abonos/ventas sin plazo. */
  dueDate: string | null;
  /** Referencia libre (notas del abono); `null` para ventas. */
  reference: string | null;
  /** Forma de pago (payment_methods.code, ej. `TR`); `null` si no aplica. */
  paymentMethodCode: string | null;
  debit: string;
  credit: string;
  runningBalance: string;
  status: string;
}

export interface AccountStatementLedgerResponseDto {
  generatedAt: string;
  generatedBy: { userId: string; email: string };
  customer: {
    id: string;
    code: string;
    name: string;
    currentBalance: string;
    creditLimit: string | null;
    availableCredit: string | null;
    address: string | null;
  };
  /** Serie + folio del último comprobante emitido; `null` si no hay ventas. */
  lastInvoice: { serie: string; folioNumber: number } | null;
  filters: {
    branchId: string | null;
    from: string | null;
    to: string | null;
  };
  openingBalance: string;
  closingBalance: string;
  movements: AccountStatementMovementDto[];
  totals: {
    movementCount: number;
    totalDebit: string;
    totalCredit: string;
  };
}
