export type PurchaseStatus = "completed" | "cancelled";
export type PurchasePaymentStatus = "paid" | "partial" | "pending";

export interface PurchaseItemDto {
  id: string;
  purchaseId: string;
  productId: string;
  productCodeSnapshot: string;
  productNameSnapshot: string;
  quantity: number;
  unitCost: string;
  discountPct: number | null;
  ivaRate: number | null;
  iepsRate: number | null;
  lineSubtotal: string;
  lineTax: string;
  lineTotal: string;
}

export interface ProviderPaymentSummaryDto {
  id: string;
  folioCode: string;
  folioNumber: number;
  amount: string;
  status: string;
  paidAt: string;
  cancelledAt: string | null;
  cancellationReason: string | null;
}

export interface PurchaseDto {
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
  subtotal: string;
  taxTotal: string;
  total: string;
  paidAmount: string;
  paymentStatus: PurchasePaymentStatus;
  notes: string | null;
  purchasedAt: string;
  satUuid: string | null;
  supplierInvoiceNumber: string | null;
  invoiceDate: string | null;
  xmlFileName: string | null;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseDetailDto extends PurchaseDto {
  items: PurchaseItemDto[];
  providerPayments: ProviderPaymentSummaryDto[];
}

export interface ListPurchasesRequest {
  page?: number;
  pageSize?: number;
  branchId?: string;
  providerId?: string;
  status?: PurchaseStatus | PurchaseStatus[];
  from?: string;
  to?: string;
}

export interface ListPurchasesResponse {
  items: PurchaseDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreatePurchaseItemRequest {
  productId: string;
  quantity: number;
  unitCost: number;
  discountPct?: number | null;
  lotNumber?: string | null;
  expirationDate?: string | null;
}

export interface NewProviderInput {
  rfc: string;
  name: string;
  legalName?: string | null;
  taxRegime?: string | null;
}

export interface CreatePurchaseRequest {
  providerId?: string;
  newProvider?: NewProviderInput | null;
  branchId: string;
  paymentMethodId: string;
  notes?: string | null;
  purchasedAt?: string;
  satUuid?: string | null;
  supplierInvoiceNumber?: string | null;
  invoiceDate?: string | null;
  xmlFileName?: string | null;
  items: CreatePurchaseItemRequest[];
}

export interface CancelPurchaseRequest {
  reason?: string | null;
}

export interface RegisterProviderPaymentRequest {
  amount: number;
  notes?: string | null;
}

export interface CancelProviderPaymentRequest {
  reason?: string | null;
}

export interface ProviderPaymentDto {
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
  amount: string;
  status: string;
  notes: string | null;
  paidAt: string;
  cancelledAt: string | null;
  cancelledBy: string | null;
  cancellationReason: string | null;
  purchase: {
    id: string;
    folioCode: string;
    folioNumber: number;
    total: string;
    paidAmount: string;
    paymentStatus: PurchasePaymentStatus;
  };
}

export interface ProviderDto {
  id: string;
  code: string;
  name: string;
  rfc: string;
  isActive: boolean;
}

export interface CreateProviderBody {
  code: string;
  name: string;
  rfc: string;
  legalName?: string;
  taxRegime?: string;
  cfdiUse?: string;
  taxZipCode?: string;
  email?: string;
  phone?: string;
}

export interface ProductDto {
  id: string;
  code: string;
  name: string;
  unit: string;
  ivaRate: number | null;
  iepsRate: number | null;
  isActive: boolean;
}
