import { roundHalfToEven } from "@/shared/domain/services/roundHalfToEven";

export interface ReturnLineInput {
  quantity: number;
  unitPrice: number;
  discountPct?: number | null;
  ivaRate?: number | null;
  iepsRate?: number | null;
  isTaxable?: boolean;
}

export interface ReturnLineTotals {
  lineSubtotal: number;
  lineIva: number;
  lineIeps: number;
  lineTax: number;
  lineTotal: number;
}

export interface ReturnTotalsResult {
  lines: ReturnLineTotals[];
  subtotal: number;
  taxTotal: number;
  total: number;
}

const SCALE = 4;

export class ReturnTotalsCalculator {
  static computeTotals(lines: ReturnLineInput[]): ReturnTotalsResult {
    const lineTotals: ReturnLineTotals[] = [];
    let subtotal = 0;
    let taxTotal = 0;
    let total = 0;

    for (const line of lines) {
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        throw new Error("quantity must be > 0");
      }
      if (!Number.isFinite(line.unitPrice) || line.unitPrice < 0) {
        throw new Error("unitPrice must be >= 0");
      }
      const discountPct = line.discountPct ?? 0;
      if (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100) {
        throw new Error("discountPct must be between 0 and 100");
      }
      const rawIvaRate = line.ivaRate ?? 0;
      if (!Number.isFinite(rawIvaRate) || rawIvaRate < 0 || rawIvaRate > 1) {
        throw new Error("ivaRate must be between 0 and 1");
      }
      const rawIepsRate = line.iepsRate ?? 0;
      if (!Number.isFinite(rawIepsRate) || rawIepsRate < 0 || rawIepsRate > 1) {
        throw new Error("iepsRate must be between 0 and 1");
      }
      // ?? true: pre-migration return items lack isTaxable; default taxable preserves prior behavior
      const isTaxable = line.isTaxable ?? true;
      const ivaRate = isTaxable ? rawIvaRate : 0;
      const iepsRate = isTaxable ? rawIepsRate : 0;

      // unitPrice is the final tax-inclusive price the customer pays; tax is
      // extracted from it (not added on top): lineSubtotal = lineGross / (1 + rates).
      const lineGross = roundHalfToEven(
        line.quantity * line.unitPrice * (1 - discountPct / 100),
        SCALE
      );
      const divisor = 1 + ivaRate + iepsRate;
      const lineSubtotal = roundHalfToEven(lineGross / divisor, SCALE);
      const lineIva = roundHalfToEven(lineSubtotal * ivaRate, SCALE);
      const lineIeps = roundHalfToEven(lineSubtotal * iepsRate, SCALE);
      const lineTax = roundHalfToEven(lineIva + lineIeps, SCALE);
      const lineTotal = lineGross;

      lineTotals.push({ lineSubtotal, lineIva, lineIeps, lineTax, lineTotal });
      subtotal = roundHalfToEven(subtotal + lineSubtotal, SCALE);
      taxTotal = roundHalfToEven(taxTotal + lineTax, SCALE);
      total = roundHalfToEven(total + lineTotal, SCALE);
    }

    return { lines: lineTotals, subtotal, taxTotal, total };
  }
}
