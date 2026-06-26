export interface TotalsLine {
  quantity: number;
  unitPrice: number;
  discountPct: number;
  ivaRate: number;
  iepsRate: number;
  isTaxable?: boolean;
}

export interface ComputedLine {
  lineSubtotal: number;
  lineIva: number;
  lineIeps: number;
  lineTotal: number;
}

export interface TotalsResult {
  lines: ComputedLine[];
  subtotal: number;
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
    // exactly half: round to even
    rounded = floor % 2 === 0 ? floor : floor + 1;
  } else {
    rounded = Math.round(shifted);
  }
  return rounded / factor;
}

export function computeTotalsClient(lines: TotalsLine[]): TotalsResult {
  const computed: ComputedLine[] = lines.map((line) => {
    // ?? true: pre-migration items lack isTaxable; default taxable preserves prior behavior
    const isTaxable = line.isTaxable ?? true;
    const effectiveIvaRate = isTaxable ? line.ivaRate : 0;
    const effectiveIepsRate = isTaxable ? line.iepsRate : 0;
    const lineSubtotal = bankersRound(
      line.quantity * line.unitPrice * (1 - line.discountPct / 100),
      4
    );
    const lineIva = bankersRound(lineSubtotal * effectiveIvaRate, 4);
    const lineIeps = bankersRound(lineSubtotal * effectiveIepsRate, 4);
    const lineTotal = lineSubtotal + lineIva + lineIeps;
    return { lineSubtotal, lineIva, lineIeps, lineTotal };
  });

  const subtotal = bankersRound(computed.reduce((sum, l) => sum + l.lineSubtotal, 0), 4);
  const taxTotal = bankersRound(
    computed.reduce((sum, l) => sum + l.lineIva + l.lineIeps, 0),
    4
  );
  const total = bankersRound(subtotal + taxTotal, 4);

  return { lines: computed, subtotal, taxTotal, total };
}
