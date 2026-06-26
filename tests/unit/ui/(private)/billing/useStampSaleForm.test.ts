/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(() => ({ push: mockPush })),
}));

jest.mock("../../../../../app/(private)/billing/_logic/services", () => ({
  stampInvoice: jest.fn(),
}));

import { useStampSaleForm } from "../../../../../app/(private)/billing/_logic/hooks/useStampSaleForm";
import { stampInvoice } from "../../../../../app/(private)/billing/_logic/services";
import { SaleAlreadyInvoicedError } from "../../../../../app/(private)/billing/_logic/errors";

const mockStamp = stampInvoice as jest.MockedFunction<typeof stampInvoice>;

function makeInvoice(id = "inv-1") {
  return { id, status: "stamped" } as Parameters<typeof mockStamp>[0] extends any ? any : never;
}

describe("useStampSaleForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPush.mockReset();
  });

  it("initial form has empty saleId", () => {
    const { result } = renderHook(() => useStampSaleForm());
    expect(result.current.form.saleId).toBe("");
  });

  it("initialSaleId populates form", () => {
    const { result } = renderHook(() => useStampSaleForm("s-initial", "TK-001"));
    expect(result.current.form.saleId).toBe("s-initial");
    expect(result.current.form.saleLabel).toBe("TK-001");
  });

  it("submit blocked + error when saleId empty", async () => {
    const { result } = renderHook(() => useStampSaleForm());
    let ret: unknown;
    await act(async () => { ret = await result.current.submit(); });
    expect(ret).toBeNull();
    expect(mockStamp).not.toHaveBeenCalled();
    expect(result.current.error).not.toBeNull();
  });

  it("submit calls stampInvoice with payload containing saleId", async () => {
    mockStamp.mockResolvedValueOnce(makeInvoice());
    const { result } = renderHook(() => useStampSaleForm("s-123"));
    await act(async () => { await result.current.submit(); });
    expect(mockStamp).toHaveBeenCalledTimes(1);
    const payload = mockStamp.mock.calls[0][0] as Record<string, unknown>;
    expect(payload.saleId).toBe("s-123");
  });

  it("submit payload does NOT include branchId or customer (sale-linked path)", async () => {
    mockStamp.mockResolvedValueOnce(makeInvoice());
    const { result } = renderHook(() => useStampSaleForm("s-123"));
    await act(async () => { await result.current.submit(); });
    const payload = mockStamp.mock.calls[0][0] as Record<string, unknown>;
    expect(payload).not.toHaveProperty("customer");
    expect(payload).not.toHaveProperty("branchId");
    expect(payload).not.toHaveProperty("items");
  });

  it("navigates to /billing/[id] on success", async () => {
    mockStamp.mockResolvedValueOnce(makeInvoice("inv-abc"));
    const { result } = renderHook(() => useStampSaleForm("s-1"));
    await act(async () => { await result.current.submit(); });
    expect(mockPush).toHaveBeenCalledWith("/billing/inv-abc");
  });

  it("SaleAlreadyInvoicedError → stored in form.error with invoiceId", async () => {
    mockStamp.mockRejectedValueOnce(new SaleAlreadyInvoicedError("inv-existing"));
    const { result } = renderHook(() => useStampSaleForm("s-1"));
    await act(async () => { await result.current.submit(); });
    expect(result.current.error).toBeInstanceOf(SaleAlreadyInvoicedError);
    expect((result.current.error as SaleAlreadyInvoicedError).invoiceId).toBe("inv-existing");
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("setField updates form fields", () => {
    const { result } = renderHook(() => useStampSaleForm());
    act(() => result.current.setField("cfdiUse", "P01"));
    expect(result.current.form.cfdiUse).toBe("P01");
  });

  it("clearError resets error to null", async () => {
    const { result } = renderHook(() => useStampSaleForm());
    await act(async () => { await result.current.submit(); });
    expect(result.current.error).not.toBeNull();
    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();
  });

  it("isSubmitting false after successful submit", async () => {
    mockStamp.mockResolvedValueOnce(makeInvoice());
    const { result } = renderHook(() => useStampSaleForm("s-1"));
    await act(async () => { await result.current.submit(); });
    expect(result.current.isSubmitting).toBe(false);
  });
});
