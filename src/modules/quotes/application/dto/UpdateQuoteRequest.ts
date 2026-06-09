import { QuoteItemInput } from "./QuoteItemDto";

export interface UpdateQuoteRequest {
  items?: QuoteItemInput[];
  notes?: string | null;
  expiresAt?: string | null;
}
