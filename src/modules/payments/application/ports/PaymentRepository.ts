import { CustomerPayment } from "../../domain/entities/CustomerPayment";
import { SalePaymentStatus } from "../../domain/value-objects/SalePaymentStatus";

export interface CreatePaymentInput {
  saleId: string;
  customerId: string;
  userId: string;
  branchId: string;
  paymentMethodId: string;
  folioId: string;
  amount: number;
  notes: string | null;
  /** null = caller has branches:access_all bypass; non-null = must match sale.branchId */
  callerBranchId: string | null;
}

export interface PaymentDisplayJoins {
  saleFolioCode: string;
  customerName: string;
  userName: string;
  branchName: string;
  paymentMethodCode: string;
}

export interface PaymentListRow {
  payment: CustomerPayment;
  joins: PaymentDisplayJoins;
}

export interface ListPaymentsFilters {
  branchId?: string;
  saleId?: string;
  customerId?: string;
  userId?: string;
  paymentMethodId?: string;
  statuses?: string[];
  from?: Date;
  to?: Date;
}

export interface ListPaymentsPagination {
  page: number;
  pageSize: number;
}

export interface PaymentWithSale {
  payment: CustomerPayment;
  sale: {
    id: string;
    folioCode: string;
    folioNumber: number;
    total: number;
    paidAmount: number;
    paymentStatus: SalePaymentStatus;
    branchId: string;
    customerId: string | null;
  };
  joins?: PaymentDisplayJoins;
}

export interface SaleTotals {
  saleId: string;
  saleBranchId: string;
  saleTotal: number;
  salePaidAmount: number;
  salePaymentStatus: SalePaymentStatus;
}

export interface HistoryFilters extends ListPaymentsFilters {
  productId?: string;
}

export interface HistoryResult {
  items: PaymentHistoryItem[];
  total: number;
  totalAmountCompleted: string;
  totalAmountCancelled: string;
  completedCount: number;
  cancelledCount: number;
}

export interface PaymentHistoryItem {
  id: string;
  createdAt: Date;
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
  amount: number;
  status: string;
  cancelledAt: Date | null;
}

export interface PaymentRepository {
  createCompleted(input: CreatePaymentInput): Promise<PaymentWithSale>;
  markCancelled(id: string, reason: string | null, userId: string): Promise<PaymentWithSale>;
  findById(id: string): Promise<PaymentWithSale | null>;
  list(
    filters: ListPaymentsFilters,
    pagination: ListPaymentsPagination
  ): Promise<{ items: PaymentListRow[]; total: number }>;
  listBySale(saleId: string): Promise<{ items: PaymentListRow[]; saleTotals: SaleTotals }>;
  findHistory(
    filters: HistoryFilters,
    pagination?: ListPaymentsPagination
  ): Promise<HistoryResult>;
}
