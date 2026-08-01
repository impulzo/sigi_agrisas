export const WAYBILL_TYPES = ["simple", "carta_porte"] as const;

export type WaybillType = (typeof WAYBILL_TYPES)[number];

export function isValidWaybillType(value: string): value is WaybillType {
  return (WAYBILL_TYPES as readonly string[]).includes(value);
}
