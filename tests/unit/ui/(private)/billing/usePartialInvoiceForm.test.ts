/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";

jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock("../../../../../app/(private)/billing/_logic/services", () => ({
  stampInvoice: jest.fn(),
}));

import { usePartialInvoiceForm } from "../../../../../app/(private)/billing/_logic/hooks/usePartialInvoiceForm";
import { stampInvoice } from "../../../../../app/(private)/billing/_logic/services";
import { computeInvoiceTotalsClient } from "../../../../../app/(private)/billing/_logic/lib/computeInvoiceTotalsClient";
import { SaleAlreadyInvoicedError } from "../../../../../app/(private)/billing/_logic/errors";
import { totalsVectors } from "../../../../fixtures/totals-vectors";

const mockStamp = stampInvoice as jest.MockedFunction<typeof stampInvoice>;

const COMPLETE_CUSTOMER = {
  rfc: "XAXX010101000",
  name: "Test SA de CV",
  cfdiUse: "G03",
  fiscalRegime: "601",
  taxZipCode: "01000",
};

function makeLine(overrides = {}) {
  return {
    productId: null,
    productCode: "LIBRE",
    description: "Línea libre",
    satProductCode: "01010101",
    satUnitCode: null,
    unit: "PZA",
    quantity: 1,
    unitPrice: 100,
    discountPct: 0,
    ivaRate: 0.16,
    iepsRate: 0,
    ...overrides,
  };
}

function makeInvoiceResult() {
  return { id: "inv-new", status: "stamped" } as Parameters<typeof mockStamp>[0] extends any ? any : never;
}

describe("usePartialInvoiceForm", () => {
  beforeEach(() => jest.clearAllMocks());

  it("fiscalMissingFields includes 'receptor' when customer is null", () => {
    const { result } = renderHook(() => usePartialInvoiceForm());
    expect(result.current.fiscalMissingFields).toContain("receptor");
  });

  it("fiscalMissingFields is empty when all fiscal fields present", () => {
    const { result } = renderHook(() => usePartialInvoiceForm());
    act(() => result.current.setCustomer(COMPLETE_CUSTOMER));
    expect(result.current.fiscalMissingFields).toHaveLength(0);
  });

  it("fiscalMissingFields lists missing fields individually", () => {
    const { result } = renderHook(() => usePartialInvoiceForm());
    act(() => result.current.setCustomer({ ...COMPLETE_CUSTOMER, cfdiUse: "", taxZipCode: "" }));
    expect(result.current.fiscalMissingFields).toContain("Uso CFDI");
    expect(result.current.fiscalMissingFields).toContain("CP fiscal");
  });

  it("submit blocked + error set when customer fiscal incomplete", async () => {
    const { result } = renderHook(() => usePartialInvoiceForm());
    act(() => result.current.addLine(makeLine()));
    let ret: unknown;
    await act(async () => { ret = await result.current.submit(); });
    expect(ret).toBeNull();
    expect(mockStamp).not.toHaveBeenCalled();
    expect(result.current.error).not.toBeNull();
  });

  it("submit blocked when no lines", async () => {
    const { result } = renderHook(() => usePartialInvoiceForm());
    act(() => result.current.setCustomer(COMPLETE_CUSTOMER));
    let ret: unknown;
    await act(async () => { ret = await result.current.submit(); });
    expect(ret).toBeNull();
    expect(mockStamp).not.toHaveBeenCalled();
  });

  it("addLine adds line and totals recompute", () => {
    const { result } = renderHook(() => usePartialInvoiceForm());
    act(() => result.current.addLine(makeLine({ unitPrice: 200, ivaRate: 0.16 })));
    expect(result.current.lines).toHaveLength(1);
    const expected = computeInvoiceTotalsClient([{ quantity: 1, unitPrice: 200, discountPct: 0, ivaRate: 0.16, iepsRate: 0 }]);
    expect(result.current.totals.total).toBeCloseTo(expected.total, 4);
  });

  it("updateLine patches unitPrice and recalculates totals", () => {
    const { result } = renderHook(() => usePartialInvoiceForm());
    act(() => result.current.addLine(makeLine({ unitPrice: 100, ivaRate: 0 })));
    const key = result.current.lines[0]._key;
    act(() => result.current.updateLine(key, { unitPrice: 500 }));
    const expected = computeInvoiceTotalsClient([{ quantity: 1, unitPrice: 500, discountPct: 0, ivaRate: 0, iepsRate: 0 }]);
    expect(result.current.totals.total).toBeCloseTo(expected.total, 4);
  });

  it("removeLine removes it", () => {
    const { result } = renderHook(() => usePartialInvoiceForm());
    act(() => result.current.addLine(makeLine()));
    const key = result.current.lines[0]._key;
    act(() => result.current.removeLine(key));
    expect(result.current.lines).toHaveLength(0);
  });

  it("submit calls stampInvoice WITHOUT saleId (standalone payload)", async () => {
    mockStamp.mockResolvedValueOnce(makeInvoiceResult());
    const { result } = renderHook(() => usePartialInvoiceForm());
    act(() => {
      result.current.setCustomer(COMPLETE_CUSTOMER);
      result.current.addLine(makeLine());
    });
    await act(async () => { await result.current.submit(); });
    expect(mockStamp).toHaveBeenCalledTimes(1);
    const payload = mockStamp.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("saleId");
    expect(payload).toHaveProperty("customer");
    expect(payload).toHaveProperty("items");
  });

  it("free line (null productId) included in payload", async () => {
    mockStamp.mockResolvedValueOnce(makeInvoiceResult());
    const { result } = renderHook(() => usePartialInvoiceForm());
    act(() => {
      result.current.setCustomer(COMPLETE_CUSTOMER);
      result.current.addLine({ ...makeLine(), productId: null, productCode: "MANUAL" });
    });
    await act(async () => { await result.current.submit(); });
    const payload = mockStamp.mock.calls[0][0] as { items: Array<{ productId: unknown }> };
    expect(payload.items[0].productId).toBeNull();
  });

  it("totals match computeInvoiceTotalsClient on shared vectors (banker's rounding)", () => {
    const vectorsWithoutIsTaxable = totalsVectors.filter((v) =>
      v.every((l) => l.isTaxable === undefined || l.isTaxable === true)
    );
    for (const vector of vectorsWithoutIsTaxable) {
      const normalized = vector.map((l) => ({
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        discountPct: l.discountPct ?? 0,
        ivaRate: l.ivaRate ?? 0,
        iepsRate: l.iepsRate ?? 0,
      }));
      const expected = computeInvoiceTotalsClient(normalized);
      const { result } = renderHook(() => usePartialInvoiceForm());
      act(() => {
        for (const l of normalized) {
          result.current.addLine({
            productId: null,
            productCode: "P",
            description: "d",
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountPct: l.discountPct,
            ivaRate: l.ivaRate,
            iepsRate: l.iepsRate,
          });
        }
      });
      expect(result.current.totals.total).toBeCloseTo(expected.total, 4);
    }
  });

  it("stamp error stored in form.error", async () => {
    mockStamp.mockRejectedValueOnce(new SaleAlreadyInvoicedError("inv-x"));
    const { result } = renderHook(() => usePartialInvoiceForm());
    act(() => {
      result.current.setCustomer(COMPLETE_CUSTOMER);
      result.current.addLine(makeLine());
    });
    await act(async () => { await result.current.submit(); });
    expect(result.current.error).toBeInstanceOf(SaleAlreadyInvoicedError);
  });
});
