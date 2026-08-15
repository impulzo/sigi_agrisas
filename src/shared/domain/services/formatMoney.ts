import { Decimal } from "decimal.js";

export function formatMoney(n: number): string {
  return new Decimal(n).toFixed(4);
}
