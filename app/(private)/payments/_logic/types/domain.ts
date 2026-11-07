export type PaymentStatus = "completed" | "cancelled";
export type SalePaymentStatus = "paid" | "partial" | "pending";

export interface PaymentItem {
  saleItemId: string;
  productNameSnapshot: string;
  amount: number;
}

export interface LineBalance {
  saleItemId: string;
  productNameSnapshot: string;
  lineTotal: number;
  paidAmount: number;
  dueAmount: number;
}

export interface Payment {
  id: string;
  saleId: string | null;
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
  status: PaymentStatus;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
  items?: PaymentItem[];
  saleTotal: number | null;
  salePaidAmount: number | null;
  salePaymentStatus: SalePaymentStatus | null;
  saleDueAmount: number | null;
}

export interface PaymentDetail extends Payment {
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  cancelledBy?: string | null;
  cancelledByName?: string | null;
}

export interface SalePaymentsData {
  payments: Payment[];
  paidAmount: number;
  total: number;
  paymentStatus: SalePaymentStatus;
  lineBalances: LineBalance[];
}

export interface PendingSale {
  saleId: string;
  folioCode: string;
  total: number;
  paidAmount: number;
  due: number;
  createdAt: Date;
}

export interface AccountDebt {
  currentBalance: number;
  pendingSales: PendingSale[];
  accountDebt: number;
}

export interface PaymentFilters {
  status?: PaymentStatus;
  branchId?: string;
  search?: string;
  from?: string;
  to?: string;
}

export interface PaymentHistoryFilters {
  userId?: string;
  customerId?: string;
  productId?: string;
  paymentMethodId?: string;
  status?: PaymentStatus;
  from?: string;
  to?: string;
  branchId?: string;
}
