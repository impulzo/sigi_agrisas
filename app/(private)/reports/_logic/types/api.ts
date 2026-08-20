// DTOs HTTP del reporte de estados de cuenta (espejo del backend).

export interface AccountStatementSummaryRowDto {
  customerId: string;
  customerCode: string;
  customerName: string;
  totalCharged: string;
  totalPaid: string;
  currentBalance: string;
  initialBalance: string;
  creditLimit: string | null;
  availableCredit: string | null;
}

export interface AccountStatementSummaryDto {
  generatedAt: string;
  generatedBy: { userId: string; email: string };
  filters: {
    branchId: string | null;
    search: string | null;
    from: string | null;
    to: string | null;
    onlyWithBalance: boolean;
  };
  items: AccountStatementSummaryRowDto[];
  totals: {
    customerCount: number;
    totalCharged: string;
    totalPaid: string;
    totalBalance: string;
  };
  page: number;
  pageSize: number;
  total: number;
}

export type AccountMovementType = "sale_credit" | "sale_cash" | "payment";

export interface AccountStatementMovementDto {
  id: string;
  date: string;
  type: AccountMovementType;
  folioCode: string;
  folioNumber: number;
  folio: string;
  serie: string;
  factura: number;
  dueDate: string | null;
  reference: string | null;
  paymentMethodCode: string | null;
  debit: string;
  credit: string;
  runningBalance: string;
  status: string;
}

export interface AccountStatementLedgerGroupDto {
  sale: AccountStatementMovementDto | null;
  payments: AccountStatementMovementDto[];
  ticketBalance: string;
}

export interface AccountStatementLedgerDto {
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
  lastInvoice: { serie: string; folioNumber: number } | null;
  filters: { branchId: string | null; from: string | null; to: string | null };
  openingBalance: string;
  closingBalance: string;
  movements: AccountStatementMovementDto[];
  groups: AccountStatementLedgerGroupDto[];
  totals: { movementCount: number; totalDebit: string; totalCredit: string };
}
