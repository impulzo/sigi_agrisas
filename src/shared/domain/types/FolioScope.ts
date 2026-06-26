export type FolioScope = "POS" | "INVENTORY" | "OPERATIONS";

export const FOLIO_SCOPES: readonly FolioScope[] = ["POS", "INVENTORY", "OPERATIONS"];

export function isFolioScope(value: unknown): value is FolioScope {
  return typeof value === "string" && (FOLIO_SCOPES as readonly string[]).includes(value);
}
