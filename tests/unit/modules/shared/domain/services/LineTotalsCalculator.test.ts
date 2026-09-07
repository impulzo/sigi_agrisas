import { computeLineTotals } from "@/shared/domain/services/LineTotalsCalculator";

describe("computeLineTotals — núcleo compartido", () => {
  it("matches SaleTotalsCalculator's simple-line vector", () => {
    const result = computeLineTotals([{ quantity: 2, price: 100, ivaRate: 0.16 }], "unitPrice");
    expect(result.lines[0]).toEqual({
      lineSubtotal: 172.4138,
      lineIva: 27.5862,
      lineIeps: 0,
      lineTax: 27.5862,
      lineTotal: 200,
    });
    expect(result.subtotal).toBe(172.4138);
    expect(result.taxTotal).toBe(27.5862);
    expect(result.total).toBe(200);
  });

  it("uses the given price field label in the error message", () => {
    expect(() => computeLineTotals([{ quantity: 1, price: -1 }], "unitCost")).toThrow(
      "unitCost must be >= 0"
    );
    expect(() => computeLineTotals([{ quantity: 1, price: -1 }], "unitPrice")).toThrow(
      "unitPrice must be >= 0"
    );
  });

  it("rejects invalid quantity regardless of price field label", () => {
    expect(() => computeLineTotals([{ quantity: 0, price: 100 }], "unitPrice")).toThrow(
      "quantity must be > 0"
    );
  });
});
