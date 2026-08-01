export interface AccountStatementSummaryRowDto {
  customerId: string;
  customerCode: string;
  customerName: string;
  totalCharged: string;
  totalPaid: string;
  currentBalance: string;
  creditLimit: string | null;
  /** `null` = crédito ilimitado (creditLimit null). */
  availableCredit: string | null;
}

export interface AccountStatementSummaryResponseDto {
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
