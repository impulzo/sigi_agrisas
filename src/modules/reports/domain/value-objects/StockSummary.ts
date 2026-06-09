import { Decimal } from "decimal.js";

export interface StockSummary {
  productCount: number;
  totalQuantity: Decimal;
}
