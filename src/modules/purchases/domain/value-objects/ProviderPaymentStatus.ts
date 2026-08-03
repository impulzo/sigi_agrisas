export type ProviderPaymentStatus = "completed" | "cancelled";

export function isProviderPaymentStatus(v: unknown): v is ProviderPaymentStatus {
  return v === "completed" || v === "cancelled";
}
