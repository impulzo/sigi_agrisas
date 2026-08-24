export interface SaleItemInput {
  productId: string;
  /** Exactly one of `productPriceId`/`dosificationId` SHALL be present. */
  productPriceId?: string;
  dosificationId?: string;
  quantity: number;
}

export interface CreateSaleRequest {
  branchId: string;
  customerId?: string | null;
  paymentMethodId: string;
  folioId: string;
  notes?: string | null;
  quoteId?: string | null;
  /** Idempotency key from offline-created sales queued via `offline-sync`. */
  clientRequestId?: string | null;
  items: SaleItemInput[];
}
