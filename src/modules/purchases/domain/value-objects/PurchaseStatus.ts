export type PurchaseStatus = "completed" | "cancelled";

export function isPurchaseStatus(v: unknown): v is PurchaseStatus {
  return v === "completed" || v === "cancelled";
}

export function canBeCancelled(status: PurchaseStatus): boolean {
  return status === "completed";
}
