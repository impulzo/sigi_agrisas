export interface TotalsVectorLine {
  quantity: number;
  unitPrice: number;
  discountPct?: number | null;
  ivaRate?: number | null;
  iepsRate?: number | null;
}

export const totalsVectors: ReadonlyArray<ReadonlyArray<TotalsVectorLine>> = [
  [{ quantity: 1, unitPrice: 100 }],
  [{ quantity: 2, unitPrice: 100, ivaRate: 0.16 }],
  [{ quantity: 1, unitPrice: 100, discountPct: 10 }],
  [{ quantity: 1, unitPrice: 100, ivaRate: 0.16, iepsRate: 0.08 }],
  [{ quantity: 1, unitPrice: 100, ivaRate: null, iepsRate: null }],
  [
    { quantity: 1, unitPrice: 100, ivaRate: 0.16 },
    { quantity: 2, unitPrice: 50 },
  ],
  [{ quantity: 3, unitPrice: 33.333, ivaRate: 0.16 }],
  [{ quantity: 1, unitPrice: 12345.6789, ivaRate: 0.16 }],
  [{ quantity: 1, unitPrice: 0.12345 }],
  [
    { quantity: 4, unitPrice: 7.77, discountPct: 13.5, ivaRate: 0.16 },
    { quantity: 1.5, unitPrice: 99.99, ivaRate: 0, iepsRate: 0.08 },
    { quantity: 100, unitPrice: 1.01, discountPct: 0, ivaRate: 0.16, iepsRate: 0 },
  ],
];
