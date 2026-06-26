export interface SaleItemInput {
  productId: string;
  productPriceId: string;
  quantity: number;
}

export interface CreateSaleRequest {
  branchId: string;
  customerId?: string | null;
  paymentMethodId: string;
  folioId: string;
  notes?: string | null;
  quoteId?: string | null;
  items: SaleItemInput[];
}
