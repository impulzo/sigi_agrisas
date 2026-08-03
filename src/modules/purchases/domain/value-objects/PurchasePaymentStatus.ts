export type PurchasePaymentStatus = "paid" | "partial" | "pending";

export function isPurchasePaymentStatus(v: unknown): v is PurchasePaymentStatus {
  return v === "paid" || v === "partial" || v === "pending";
}
