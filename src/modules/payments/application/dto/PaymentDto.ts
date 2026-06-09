import { SalePaymentStatus } from "../../domain/value-objects/SalePaymentStatus";

export interface PaymentDto {
  id: string;
  saleId: string;
  saleFolioCode: string;
  customerId: string;
  customerName: string;
  userId: string;
  userName: string;
  branchId: string;
  branchName: string;
  paymentMethodId: string;
  paymentMethodCode: string;
  folioId: string;
  folioCode: string;
  folioNumber: number;
  amount: string;
  status: string;
  notes: string | null;
  createdAt: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
}

export interface PaymentDetailDto extends PaymentDto {
  sale: {
    id: string;
    folioCode: string;
    folioNumber: number;
    total: string;
    paidAmount: string;
    paymentStatus: SalePaymentStatus;
  };
}

export interface PaymentHistoryRowDto {
  id: string;
  createdAt: string;
  folioCode: string;
  saleId: string;
  saleFolioCode: string;
  customerId: string;
  customerName: string;
  userId: string;
  userName: string;
  branchId: string;
  branchName: string;
  paymentMethodCode: string;
  amount: string;
  status: string;
  cancelledAt: string | null;
}

export interface PaymentHistoryReportDto {
  generatedAt: string;
  generatedBy: { userId: string; email: string };
  filters: {
    userId: string | null;
    saleId: string | null;
    customerId: string | null;
    productId: string | null;
    paymentMethodId: string | null;
    status: string[];
    from: string | null;
    to: string | null;
    branchId: string | null;
  };
  items: PaymentHistoryRowDto[];
  totals: {
    rowCount: number;
    completedCount: number;
    cancelledCount: number;
    totalAmountCompleted: string;
    totalAmountCancelled: string;
  };
  page: number;
  pageSize: number;
  total: number;
}
