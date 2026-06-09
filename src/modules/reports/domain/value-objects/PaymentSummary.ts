import { Decimal } from "decimal.js";

export interface PaymentSummary {
  totalPayments: number;
  totalAmount: Decimal;
  cancelledPayments: number;
  cancelledAmount: Decimal;
  netAmount: Decimal;
}
