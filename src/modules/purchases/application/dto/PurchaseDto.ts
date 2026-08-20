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
  status: string;
  subtotal: string;
  taxTotal: string;
  total: string;
  paidAmount: string;
  paymentStatus: string;
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
  page: number;
  pageSize: number;
  branchId?: string;
  providerId?: string;
  statuses?: string[];
  from?: Date;
  to?: Date;
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
  expirationDate?: Date | null;
  manufactureDate?: Date | null;
}

export interface CreatePurchaseRequest {
  providerId?: string;
  branchId: string;
  paymentMethodId: string;
  notes?: string | null;
  creatorId: string;
  items: CreatePurchaseItemRequest[];
  purchasedAt?: string | Date;
  satUuid?: string | null;
  supplierInvoiceNumber?: string | null;
  invoiceDate?: string | Date | null;
  xmlFileName?: string | null;
  newProvider?: {
    rfc: string;
    name: string;
    legalName?: string | null;
    taxRegime?: string | null;
  } | null;
}

export interface CancelPurchaseRequest {
  id: string;
  cancelledBy: string;
  cancellationReason: string | null;
}
