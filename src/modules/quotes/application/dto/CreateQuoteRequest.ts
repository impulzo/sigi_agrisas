import { QuoteItemInput } from "./QuoteItemDto";

export interface CreateQuoteRequest {
  branchId: string;
  customerId?: string | null;
  folioId: string;
  notes?: string | null;
  expiresAt?: string | null;
  /** Idempotency key from offline-created quotes queued via `offline-sync`. */
  clientRequestId?: string | null;
  items: QuoteItemInput[];
}
