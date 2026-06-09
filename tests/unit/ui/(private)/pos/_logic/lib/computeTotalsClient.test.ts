import { computeTotalsClient } from "../../../../../../../app/(private)/pos/_logic/lib/computeTotalsClient";

describe("computeTotalsClient", () => {
  it("línea simple sin impuestos ni descuento", () => {
    const result = computeTotalsClient([
      { quantity: 2, unitPrice: 100, discountPct: 0, ivaRate: 0, iepsRate: 0 },
    ]);
    expect(result.lines[0].lineSubtotal).toBe(200);
    expect(result.lines[0].lineIva).toBe(0);
    expect(result.lines[0].lineIeps).toBe(0);
    expect(result.lines[0].lineTotal).toBe(200);
    expect(result.subtotal).toBe(200);
    expect(result.taxTotal).toBe(0);
    expect(result.total).toBe(200);
  });

  it("línea con descuento del 10%", () => {
    const result = computeTotalsClient([
      { quantity: 1, unitPrice: 100, discountPct: 10, ivaRate: 0, iepsRate: 0 },
    ]);
    expect(result.lines[0].lineSubtotal).toBe(90);
    expect(result.total).toBe(90);
  });

  it("línea con IVA 16%", () => {
    const result = computeTotalsClient([
      { quantity: 1, unitPrice: 100, discountPct: 0, ivaRate: 0.16, iepsRate: 0 },
    ]);
    expect(result.lines[0].lineSubtotal).toBe(100);
    expect(result.lines[0].lineIva).toBe(16);
    expect(result.lines[0].lineIeps).toBe(0);
    expect(result.lines[0].lineTotal).toBe(116);
    expect(result.subtotal).toBe(100);
    expect(result.taxTotal).toBe(16);
    expect(result.total).toBe(116);
  });

  it("línea con IVA + IEPS", () => {
    const result = computeTotalsClient([
      { quantity: 1, unitPrice: 100, discountPct: 0, ivaRate: 0.16, iepsRate: 0.08 },
    ]);
    expect(result.lines[0].lineIva).toBe(16);
    expect(result.lines[0].lineIeps).toBe(8);
    expect(result.lines[0].lineTotal).toBe(124);
    expect(result.taxTotal).toBe(24);
    expect(result.total).toBe(124);
  });

  it("null rates se tratan como 0 a través del caller (ivaRate=0, iepsRate=0)", () => {
    const result = computeTotalsClient([
      { quantity: 1, unitPrice: 50, discountPct: 0, ivaRate: 0, iepsRate: 0 },
    ]);
    expect(result.lines[0].lineIva).toBe(0);
    expect(result.lines[0].lineIeps).toBe(0);
  });

  it("multi-línea calcula subtotales individuales y suma global", () => {
    const result = computeTotalsClient([
      { quantity: 2, unitPrice: 100, discountPct: 0, ivaRate: 0.16, iepsRate: 0 },
      { quantity: 3, unitPrice: 50,  discountPct: 0, ivaRate: 0.16, iepsRate: 0 },
    ]);
    expect(result.lines[0].lineSubtotal).toBe(200);
    expect(result.lines[1].lineSubtotal).toBe(150);
    expect(result.subtotal).toBe(350);
    expect(result.taxTotal).toBe(56);
    expect(result.total).toBe(406);
  });

  it("banker's rounding .12345 → redondea a par (a 4 decimales)", () => {
    // 1 * 0.12345 with discount 0 and no taxes
    // lineSubtotal = 0.1234 (4 decimales, banker's round: .12345 → .1234 because 4 is even)
    const result = computeTotalsClient([
      { quantity: 1, unitPrice: 0.12345, discountPct: 0, ivaRate: 0, iepsRate: 0 },
    ]);
    // 0.12345 × 1 × 1 = 0.12345 → banker's round 4 dec → .1234 (4 is even)
    expect(result.lines[0].lineSubtotal).toBe(0.1234);
  });

  it("carrito vacío devuelve totales en cero", () => {
    const result = computeTotalsClient([]);
    expect(result.subtotal).toBe(0);
    expect(result.taxTotal).toBe(0);
    expect(result.total).toBe(0);
    expect(result.lines).toHaveLength(0);
  });
});
