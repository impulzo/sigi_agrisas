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

// Half-to-even (banker's) rounding at `decimals` precision.
function roundHalfToEven(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  const scaled = value * factor;
  const floor = Math.floor(scaled);
  const diff = scaled - floor;
  const eps = 1e-9;
  let rounded: number;
  if (diff > 0.5 + eps) {
    rounded = floor + 1;
  } else if (diff < 0.5 - eps) {
    rounded = floor;
  } else {
    rounded = floor % 2 === 0 ? floor : floor + 1;
  }
  return rounded / factor;
}

const SCALE = 4;

export class PurchaseTotalsCalculator {
  static computeTotals(lines: PurchaseLineInput[]): PurchaseTotalsResult {
    const lineTotals: PurchaseLineTotals[] = [];
    let subtotal = 0;
    let taxTotal = 0;
    let total = 0;

    for (const line of lines) {
      if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
        throw new Error("quantity must be > 0");
      }
      if (!Number.isFinite(line.unitCost) || line.unitCost < 0) {
        throw new Error("unitCost must be >= 0");
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
      const isTaxable = line.isTaxable ?? true;
      const ivaRate = isTaxable ? rawIvaRate : 0;
      const iepsRate = isTaxable ? rawIepsRate : 0;

      const lineSubtotal = roundHalfToEven(
        line.quantity * line.unitCost * (1 - discountPct / 100),
        SCALE
      );
      const lineIva = roundHalfToEven(lineSubtotal * ivaRate, SCALE);
      const lineIeps = roundHalfToEven(lineSubtotal * iepsRate, SCALE);
      const lineTax = roundHalfToEven(lineIva + lineIeps, SCALE);
      const lineTotal = roundHalfToEven(lineSubtotal + lineTax, SCALE);

      lineTotals.push({ lineSubtotal, lineIva, lineIeps, lineTax, lineTotal });
      subtotal = roundHalfToEven(subtotal + lineSubtotal, SCALE);
      taxTotal = roundHalfToEven(taxTotal + lineTax, SCALE);
      total = roundHalfToEven(total + lineTotal, SCALE);
    }

    return { lines: lineTotals, subtotal, taxTotal, total };
  }
}
