export interface PaymentItemDto {
  paymentId: string;
  folioNumber: string;
  saleId: string;
  saleFolioNumber: string;
  customerId: string;
  customerCode: string;
  customerName: string;
  branchId: string;
  branchCode: string;
  amount: string;
  paymentDate: string;
  status: string;
  registeredBy: string;
  registeredByEmail: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
}

export interface PaymentHistoryReportResponseDto {
  generatedAt: string;
  generatedBy: { userId: string; email: string };
  filters: {
    branchId: string | null;
    customerId: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  summary: {
    totalPayments: number;
    totalAmount: string;
    cancelledPayments: number;
    cancelledAmount: string;
    netAmount: string;
  };
  payments: PaymentItemDto[];
}
