export interface PaymentDto {
  id: string;
  saleId: string;
  saleFolioCode?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  userId: string;
  userName?: string | null;
  branchId: string;
  branchName?: string | null;
  paymentMethodId: string;
  paymentMethodName?: string | null;
  folioId: string;
  folioCode?: string | null;
  folioNumber: number;
  folioPrefix?: string | null;
  amount: number;
  status: "completed" | "cancelled";
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentDetailDto extends PaymentDto {
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
  cancelledByName?: string | null;
}

export interface ListPaymentsRequest {
  page?: number;
  pageSize?: number;
  status?: "completed" | "cancelled";
  branchId?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface ListPaymentsResponse {
  items: PaymentDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListSalePaymentsResponse {
  items: PaymentDto[];
  paidAmount: number;
  total: number;
  paymentStatus: "paid" | "partial" | "pending";
}

export interface PaymentHistoryRowDto {
  id: string;
  saleId: string;
  saleFolioCode?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  userId: string;
  userName?: string | null;
  branchId: string;
  branchName?: string | null;
  paymentMethodId: string;
  paymentMethodName?: string | null;
  folioCode?: string | null;
  folioNumber: number;
  folioPrefix?: string | null;
  amount: number;
  status: "completed" | "cancelled";
  createdAt: string;
}

export interface PaymentHistoryReportDto {
  items: PaymentHistoryRowDto[];
  completedCount: number;
  cancelledCount: number;
  totalAmountCompleted: number;
  totalAmountCancelled: number;
  total: number;
  page: number;
  pageSize: number;
}

export interface RegisterPaymentBody {
  saleId: string;
  amount: number;
  paymentMethodId: string;
  folioId: string;
  notes?: string;
}

export interface CancelPaymentBody {
  reason?: string;
}
