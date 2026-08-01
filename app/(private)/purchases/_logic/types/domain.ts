import type { PurchaseStatus, PurchasePaymentStatus } from "./api";

export interface PurchaseItem {
  id: string;
  purchaseId: string;
  productId: string;
  productCodeSnapshot: string;
  productNameSnapshot: string;
  quantity: number;
  unitCost: number;
  discountPct: number | null;
  ivaRate: number | null;
  iepsRate: number | null;
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
}

export interface ProviderPaymentSummary {
  id: string;
  folioCode: string;
  folioNumber: number;
  amount: number;
  status: string;
  paidAt: Date;
  cancelledAt: Date | null;
  cancellationReason: string | null;
}

export interface Purchase {
  id: string;
  providerId: string;
  providerName: string | null;
  providerRfc: string | null;
  branchId: string;
  branchName: string | null;
  paymentMethodId: string;
  paymentMethodCode: string | null;
  paymentMethodIsCredit: boolean;
  creatorId: string;
  creatorName: string | null;
  folioId: string;
  folioNumber: number;
  folioCode: string;
  status: PurchaseStatus;
  subtotal: number;
  taxTotal: number;
  total: number;
  paidAmount: number;
  paymentStatus: PurchasePaymentStatus;
  notes: string | null;
  purchasedAt: Date;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PurchaseDetail extends Purchase {
  items: PurchaseItem[];
  providerPayments: ProviderPaymentSummary[];
}

export interface ProviderPayment {
  id: string;
  purchaseId: string;
  purchaseFolioCode: string;
  providerId: string;
  providerName: string | null;
  branchId: string;
  branchName: string | null;
  folioId: string;
  folioNumber: number;
  folioCode: string;
  creatorId: string;
  creatorName: string | null;
  amount: number;
  status: string;
  notes: string | null;
  paidAt: Date;
  cancelledAt: Date | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  purchase: {
    id: string;
    folioCode: string;
    folioNumber: number;
    total: number;
    paidAmount: number;
    paymentStatus: PurchasePaymentStatus;
  };
}

export interface PurchaseFilters {
  page: number;
  pageSize: number;
  status: PurchaseStatus[];
  branchId?: string;
  providerId?: string;
  from?: string;
  to?: string;
}
