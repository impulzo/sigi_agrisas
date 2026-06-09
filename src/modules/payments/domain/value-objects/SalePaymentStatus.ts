export type SalePaymentStatus = "paid" | "partial" | "pending";

export function isSalePaymentStatus(v: unknown): v is SalePaymentStatus {
  return v === "paid" || v === "partial" || v === "pending";
}
