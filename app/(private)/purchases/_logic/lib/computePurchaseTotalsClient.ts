export interface PurchaseTotalsLine {
  quantity: number;
  unitCost: number;
  discountPct: number;
  ivaRate: number;
  iepsRate: number;
}

export interface PurchaseComputedLine {
  lineSubtotal: number;
  lineIva: number;
  lineIeps: number;
  lineTotal: number;
}

export interface PurchaseTotalsResult {
  lines: PurchaseComputedLine[];
  subtotal: number;
  ivaTotal: number;
  iepsTotal: number;
  taxTotal: number;
  total: number;
}

// Banker's rounding (round-half-to-even) to n decimal places
function bankersRound(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  const shifted = value * factor;
  const floor = Math.floor(shifted);
  const diff = shifted - floor;
  let rounded: number;
  if (Math.abs(diff - 0.5) < 1e-10) {
    rounded = floor % 2 === 0 ? floor : floor + 1;
  } else {
    rounded = Math.round(shifted);
  }
  return rounded / factor;
}

export function computePurchaseTotalsClient(lines: PurchaseTotalsLine[]): PurchaseTotalsResult {
  const computed: PurchaseComputedLine[] = [];
  let subtotal = 0;
  let ivaTotal = 0;
  let iepsTotal = 0;
  let total = 0;

  for (const line of lines) {
    // unitCost is the final tax-inclusive cost Agrisas pays; tax is
    // extracted from it (not added on top): lineSubtotal = lineGross / (1 + rates).
    const lineGross = bankersRound(
      line.quantity * line.unitCost * (1 - line.discountPct / 100),
      4
    );
    const divisor = 1 + line.ivaRate + line.iepsRate;
    const lineSubtotal = bankersRound(lineGross / divisor, 4);
    const lineIva = bankersRound(lineSubtotal * line.ivaRate, 4);
    const lineIeps = bankersRound(lineSubtotal * line.iepsRate, 4);
    const lineTotal = lineGross;

    computed.push({ lineSubtotal, lineIva, lineIeps, lineTotal });
    subtotal = bankersRound(subtotal + lineSubtotal, 4);
    ivaTotal = bankersRound(ivaTotal + lineIva, 4);
    iepsTotal = bankersRound(iepsTotal + lineIeps, 4);
    total = bankersRound(total + lineTotal, 4);
  }

  const taxTotal = bankersRound(ivaTotal + iepsTotal, 4);

  return { lines: computed, subtotal, ivaTotal, iepsTotal, taxTotal, total };
}
