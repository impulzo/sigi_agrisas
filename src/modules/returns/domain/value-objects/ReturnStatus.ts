export type ReturnStatus = "completed" | "cancelled";

export function canBeCancelled(status: ReturnStatus): boolean {
  return status === "completed";
}
