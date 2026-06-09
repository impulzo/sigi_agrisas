export type QuoteStatus = "draft" | "authorized" | "converted" | "cancelled" | "expired";

export const QUOTE_STATUSES: readonly QuoteStatus[] = [
  "draft",
  "authorized",
  "converted",
  "cancelled",
  "expired",
] as const;

export function isQuoteStatus(value: string): value is QuoteStatus {
  return (QUOTE_STATUSES as readonly string[]).includes(value);
}

export function canBeEdited(status: QuoteStatus): boolean {
  return status === "draft";
}

export function canBeAuthorized(status: QuoteStatus): boolean {
  return status === "draft";
}

export function canBeCancelled(status: QuoteStatus): boolean {
  return status === "draft" || status === "authorized";
}

export function canBeConverted(status: QuoteStatus): boolean {
  return status === "authorized";
}
