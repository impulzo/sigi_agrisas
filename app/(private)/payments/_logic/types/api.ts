export interface PaymentItemDto {
  saleItemId: string;
  productNameSnapshot: string;
  amount: string;
}

export interface CustomerSearchResultDto {
  id: string;
  code: string;
  name: string;
  rfc: string;
}

export interface ProductSearchResultDto {
  id: string;
  code: string;
  name: string;
}

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
  paymentMethodCode: string;
  folioId: string;
  folioCode?: string | null;
  folioNumber: number;
  folioPrefix?: string | null;
  amount: number;
  status: "completed" | "cancelled";
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: PaymentItemDto[];
  saleTotal: string;
  salePaidAmount: string;
  salePaymentStatus: "paid" | "partial" | "pending";
  saleDueAmount: string;
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

export interface LineBalanceDto {
  saleItemId: string;
  productNameSnapshot: string;
  lineTotal: string;
  paidAmount: string;
  dueAmount: string;
}

export interface ListSalePaymentsResponse {
  items: PaymentDto[];
  saleId: string;
  saleTotal: string;
  salePaidAmount: string;
  salePaymentStatus: "paid" | "partial" | "pending";
  saleDueAmount: string;
  lineBalances: LineBalanceDto[];
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
  paymentMethodCode: string;
  folioCode?: string | null;
  amount: number;
  status: "completed" | "cancelled";
  createdAt: string;
  saleTotal: string;
  salePaidAmount: string;
  salePaymentStatus: "paid" | "partial" | "pending";
  saleDueAmount: string;
}

export interface PaymentHistoryReportDto {
  items: PaymentHistoryRowDto[];
  totals: {
    rowCount: number;
    completedCount: number;
    cancelledCount: number;
    totalAmountCompleted: string;
    totalAmountCancelled: string;
  };
  total: number;
  page: number;
  pageSize: number;
}

export interface RegisterPaymentItemBody {
  saleItemId: string;
  amount: number;
}

export interface RegisterPaymentBody {
  saleId: string;
  amount: number;
  paymentMethodId: string;
  folioId: string;
  notes?: string;
  items?: RegisterPaymentItemBody[];
}

export interface CancelPaymentBody {
  reason?: string;
}
