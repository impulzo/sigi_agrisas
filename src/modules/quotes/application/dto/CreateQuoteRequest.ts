import { QuoteItemInput } from "./QuoteItemDto";

export interface CreateQuoteRequest {
  branchId: string;
  customerId?: string | null;
  folioId: string;
  notes?: string | null;
  expiresAt?: string | null;
  items: QuoteItemInput[];
}
