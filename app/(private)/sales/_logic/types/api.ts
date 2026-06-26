export interface SaleItemDto {
  id: string;
  productId: string;
  productCodeSnapshot: string;
  productNameSnapshot: string;
  productPriceId: string;
  priceNameSnapshot: string;
  quantity: number;
  unitPrice: number;
  discountPct: number;
  ivaRate: number;
  iepsRate: number;
  lineSubtotal: number;
  lineIva: number;
  lineIeps: number;
  lineTotal: number;
}

export interface SaleSummaryDto {
  id: string;
  branchId: string;
  branchName?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  cashierId: string;
  cashierName?: string | null;
  folioId: string;
  folioNumber: number;
  folioPrefix?: string | null;
  paymentMethodId: string;
  paymentMethodName?: string | null;
  status: "completed" | "cancelled" | "edited" | "returned_total";
  subtotal: number;
  taxTotal: number;
  total: number;
  paidAmount: number;
  paymentStatus: "paid" | "partial" | "pending";
  isCredit: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SaleDetailDto extends SaleSummaryDto {
  notes?: string | null;
  cancelledAt?: string | null;
  cancellationReason?: string | null;
  editedAt?: string | null;
  items: SaleItemDto[];
  returnedQuantityBySaleItem: Record<string, number>;
}

export interface ListSalesResponse {
  items: SaleSummaryDto[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CancelSaleBody {
  reason?: string;
}

export interface EditSaleBody {
  customerId?: string | null;
  paymentMethodId?: string;
  notes?: string | null;
  items?: {
    productId: string;
    productPriceId: string;
    quantity: number;
    discountPctOverride?: number;
  }[];
}
