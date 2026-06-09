export interface TotalsLine {
  quantity: number;
  unitPrice: number;
  discountPct: number;
  ivaRate: number;
  iepsRate: number;
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
    const lineSubtotal = bankersRound(
      line.quantity * line.unitPrice * (1 - line.discountPct / 100),
      4
    );
    const lineIva = bankersRound(lineSubtotal * line.ivaRate, 4);
    const lineIeps = bankersRound(lineSubtotal * line.iepsRate, 4);
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
