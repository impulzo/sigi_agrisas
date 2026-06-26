export interface SaleItem {
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

export interface SaleSummary {
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
  createdAt: Date;
  updatedAt: Date;
}

export interface SaleDetail extends SaleSummary {
  notes?: string | null;
  cancelledAt?: Date | null;
  cancellationReason?: string | null;
  editedAt?: Date | null;
  items: SaleItem[];
  returnedQuantityBySaleItem: Record<string, number>;
}
