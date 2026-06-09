export type PaymentStatus = "completed" | "cancelled";

export function isPaymentStatus(v: unknown): v is PaymentStatus {
  return v === "completed" || v === "cancelled";
}
