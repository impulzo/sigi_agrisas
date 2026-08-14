/**
 * @jest-environment jsdom
 */
import { buildInvoicePreview } from "../../../../../app/(private)/billing/_logic/lib/buildInvoicePreview";

describe("buildInvoicePreview", () => {
  it("computes totals matching computeInvoiceTotalsClient for a single line", () => {
    const preview = buildInvoicePreview({
      issuer: { name: "Agrisas", branchName: "Matriz" },
      receiver: { rfc: "XAXX010101000", name: "Cliente", cfdiUse: "G03", fiscalRegime: "601", taxZipCode: "45010" },
      lines: [
        { description: "Fertilizante", productCode: "SKU1", quantity: 1, unitPrice: 100, discountPct: 0, ivaRate: 0.16, iepsRate: 0 },
      ],
      paymentForm: "01",
      paymentMethod: "PUE",
    });

    expect(preview.lines).toHaveLength(1);
    expect(preview.lines[0].lineTotal).toBeCloseTo(100, 4);
    expect(preview.lines[0].lineSubtotal).toBeCloseTo(86.2069, 3);
    expect(preview.total).toBeCloseTo(100, 4);
    expect(preview.subtotal).toBeCloseTo(86.2069, 3);
    expect(preview.taxTotal).toBeCloseTo(13.7931, 3);
  });

  it("aggregates totals across multiple lines", () => {
    const preview = buildInvoicePreview({
      issuer: { name: "Agrisas" },
      receiver: { rfc: "XAXX010101000", name: "Cliente", cfdiUse: "G03", fiscalRegime: "601", taxZipCode: "45010" },
      lines: [
        { description: "A", productCode: "A1", quantity: 2, unitPrice: 50, discountPct: 0, ivaRate: 0.16, iepsRate: 0 },
        { description: "B", productCode: "B1", quantity: 1, unitPrice: 200, discountPct: 10, ivaRate: 0.16, iepsRate: 0 },
      ],
      paymentForm: "01",
      paymentMethod: "PUE",
    });

    expect(preview.lines).toHaveLength(2);
    expect(preview.total).toBeCloseTo(2 * 50 + 200 * 0.9, 4);
  });

  it("defaults currency to MXN and preserves issuer/receiver/payment fields", () => {
    const preview = buildInvoicePreview({
      issuer: { name: "Agrisas", branchName: "Sucursal Norte" },
      receiver: { rfc: "CAN850101AAA", name: "Cliente SA", cfdiUse: "G01", fiscalRegime: "601", taxZipCode: "01000" },
      lines: [],
      paymentForm: "03",
      paymentMethod: "PPD",
    });

    expect(preview.currency).toBe("MXN");
    expect(preview.issuer).toEqual({ name: "Agrisas", branchName: "Sucursal Norte" });
    expect(preview.receiver.rfc).toBe("CAN850101AAA");
    expect(preview.paymentForm).toBe("03");
    expect(preview.paymentMethod).toBe("PPD");
    expect(preview.lines).toEqual([]);
    expect(preview.total).toBe(0);
  });

  it("derives satProductCode as null when omitted", () => {
    const preview = buildInvoicePreview({
      issuer: { name: "Agrisas" },
      receiver: { rfc: "XAXX010101000", name: "Cliente", cfdiUse: "G03", fiscalRegime: "601", taxZipCode: "45010" },
      lines: [
        { description: "Libre", productCode: "LIB-1", quantity: 1, unitPrice: 10, discountPct: 0, ivaRate: 0, iepsRate: 0 },
      ],
      paymentForm: "01",
      paymentMethod: "PUE",
    });

    expect(preview.lines[0].satProductCode).toBeNull();
  });
});
