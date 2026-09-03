import { computeLineTotals } from "@/shared/domain/services/LineTotalsCalculator";

export interface PurchaseLineInput {
  quantity: number;
  unitCost: number;
  discountPct?: number | null;
  ivaRate?: number | null;
  iepsRate?: number | null;
  isTaxable?: boolean;
}

export interface PurchaseLineTotals {
  lineSubtotal: number;
  lineIva: number;
  lineIeps: number;
  lineTax: number;
  lineTotal: number;
}

export interface PurchaseTotalsResult {
  lines: PurchaseLineTotals[];
  subtotal: number;
  taxTotal: number;
  total: number;
}

export class PurchaseTotalsCalculator {
  static computeTotals(lines: PurchaseLineInput[]): PurchaseTotalsResult {
    return computeLineTotals(
      lines.map((line) => ({
        quantity: line.quantity,
        price: line.unitCost,
        discountPct: line.discountPct,
        ivaRate: line.ivaRate,
        iepsRate: line.iepsRate,
        isTaxable: line.isTaxable,
      })),
      "unitCost"
    );
  }
}
