export interface CashCutRowDto {
  paymentId: string;
  customerCode: string;
  docto: string;
  factura: string;
  customerName: string;
  facturaDate: string;
  days: number;
  amount: string;
  paymentMethodCode: string;
  paymentMethodName: string;
  reference: string | null;
  collectedAt: string;
  ivaAmount: string;
  taxRatePct: string;
}

export interface CashCutPaymentMethodBreakdownDto {
  paymentMethodId: string;
  code: string;
  label: string;
  count: number;
  total: string;
}

export interface CashCutReportDto {
  generatedAt: string;
  generatedBy: { userId: string; email: string };
  filters: {
    branchId: string | null;
    customerId: string | null;
    paymentMethodId: string | null;
    from: string;
    to: string;
  };
  totals: {
    totalCollected: string;
    totalIva: string;
  };
  byPaymentMethod: CashCutPaymentMethodBreakdownDto[];
  rows: CashCutRowDto[];
}
