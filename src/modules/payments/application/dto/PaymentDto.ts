import { SalePaymentStatus } from "../../domain/value-objects/SalePaymentStatus";

export interface PaymentItemDto {
  saleItemId: string;
  productNameSnapshot: string;
  amount: string;
}

export interface PaymentDto {
  id: string;
  saleId: string | null;
  saleFolioCode: string | null;
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
  items?: PaymentItemDto[];
  saleTotal: string | null;
  salePaidAmount: string | null;
  salePaymentStatus: SalePaymentStatus | null;
  saleDueAmount: string | null;
}

export interface PaymentDetailDto extends PaymentDto {
  sale: {
    id: string;
    folioCode: string;
    folioNumber: number;
    total: string;
    paidAmount: string;
    paymentStatus: SalePaymentStatus;
  } | null;
}

export interface PaymentHistoryRowDto {
  id: string;
  createdAt: string;
  folioCode: string;
  saleId: string | null;
  saleFolioCode: string | null;
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
  saleTotal: string | null;
  salePaidAmount: string | null;
  salePaymentStatus: SalePaymentStatus | null;
  saleDueAmount: string | null;
}

export interface PendingSaleDto {
  saleId: string;
  folioCode: string;
  total: string;
  paidAmount: string;
  due: string;
  createdAt: string;
}

export interface AccountDebtDto {
  currentBalance: string;
  pendingSales: PendingSaleDto[];
  accountDebt: string;
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
