export const WAYBILL_STATUSES = ["completed", "cancelled"] as const;

export type WaybillStatus = (typeof WAYBILL_STATUSES)[number];

export function isValidWaybillStatus(value: string): value is WaybillStatus {
  return (WAYBILL_STATUSES as readonly string[]).includes(value);
}
