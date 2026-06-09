/**
 * @jest-environment jsdom
 */
import React from "react";
import { act, renderHook, waitFor } from "@testing-library/react";

jest.mock("../../../../../../app/(private)/quotes/_logic/services/listQuotes");
jest.mock("../../../../../../app/(private)/quotes/_logic/services/getQuote");
jest.mock("../../../../../../app/(private)/quotes/_logic/services/authorizeQuote");
jest.mock("../../../../../../app/(private)/quotes/_logic/services/cancelQuote");
jest.mock("../../../../../../app/(private)/quotes/_logic/services/convertQuote");
jest.mock("../../../../../../app/(private)/quotes/_logic/services/updateQuote");
jest.mock("../../../../../../app/_hooks/useDebounce", () => ({
  useDebounce: (v: unknown) => v,
}));

import { listQuotes } from "../../../../../../app/(private)/quotes/_logic/services/listQuotes";
import { getQuote } from "../../../../../../app/(private)/quotes/_logic/services/getQuote";
import { authorizeQuote } from "../../../../../../app/(private)/quotes/_logic/services/authorizeQuote";
import { cancelQuote } from "../../../../../../app/(private)/quotes/_logic/services/cancelQuote";
import { convertQuote } from "../../../../../../app/(private)/quotes/_logic/services/convertQuote";
import { updateQuote } from "../../../../../../app/(private)/quotes/_logic/services/updateQuote";
import { useQuotesList } from "../../../../../../app/(private)/quotes/_logic/hooks/useQuotesList";
import { useQuoteDetail } from "../../../../../../app/(private)/quotes/_logic/hooks/useQuoteDetail";
import { useQuoteMutations } from "../../../../../../app/(private)/quotes/_logic/hooks/useQuoteMutations";
import type { QuoteDetail } from "../../../../../../app/(private)/quotes/_logic/types/domain";
import type { SaleDetail } from "../../../../../../app/(private)/sales/_logic/types/domain";

const mockListQuotes = listQuotes as jest.MockedFunction<typeof listQuotes>;
const mockGetQuote = getQuote as jest.MockedFunction<typeof getQuote>;
const mockAuthorizeQuote = authorizeQuote as jest.MockedFunction<typeof authorizeQuote>;
const mockCancelQuote = cancelQuote as jest.MockedFunction<typeof cancelQuote>;
const mockConvertQuote = convertQuote as jest.MockedFunction<typeof convertQuote>;
const mockUpdateQuote = updateQuote as jest.MockedFunction<typeof updateQuote>;

const baseQuote: QuoteDetail = {
  id: "q1",
  branchId: "b1",
  customerId: null,
  customerName: null,
  creatorId: "u1",
  creatorName: null,
  folioId: "f1",
  folioNumber: 1,
  folioPrefix: "COT",
  status: "draft",
  isExpired: false,
  subtotal: 100,
  taxTotal: 16,
  total: 116,
  expiresAt: null,
  createdAt: new Date("2026-06-01"),
  updatedAt: new Date("2026-06-01"),
  items: [],
};

const baseSale: SaleDetail = {
  id: "s1",
  branchId: "b1",
  branchName: "Main",
  cashierId: "u1",
  cashierName: null,
  customerId: null,
  customerName: null,
  folioId: "f1",
  folioNumber: 1,
  folioPrefix: "A",
  paymentMethodId: "pm1",
  paymentMethodName: "Efectivo",
  status: "completed",
  subtotal: 100,
  taxTotal: 16,
  total: 116,
  paidAmount: 116,
  paymentStatus: "paid",
  isCredit: false,
  createdAt: new Date("2026-06-01"),
  updatedAt: new Date("2026-06-01"),
  items: [],
  returnedQuantityBySaleItem: {},
};

describe("useQuotesList", () => {
  beforeEach(() => {
    mockListQuotes.mockReset();
  });

  it("carga los items correctamente", async () => {
    mockListQuotes.mockResolvedValue({ items: [baseQuote], total: 1, page: 1, pageSize: 20 });
    const { result } = renderHook(() => useQuotesList({ page: 1, pageSize: 20 }));
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(1);
  });

  it("expone error cuando listQuotes falla", async () => {
    mockListQuotes.mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() => useQuotesList({ page: 1, pageSize: 20 }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(Error);
  });

  it("refresh dispara nueva llamada", async () => {
    mockListQuotes.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
    const { result } = renderHook(() => useQuotesList({ page: 1, pageSize: 20 }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => { result.current.refresh(); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListQuotes).toHaveBeenCalledTimes(2);
  });
});

describe("useQuoteDetail", () => {
  beforeEach(() => {
    mockGetQuote.mockReset();
  });

  it("carga el detalle correctamente", async () => {
    mockGetQuote.mockResolvedValue(baseQuote);
    const { result } = renderHook(() => useQuoteDetail("q1"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.quote?.id).toBe("q1");
  });

  it("no actualiza estado después de desmonte (cancel-on-unmount)", async () => {
    let resolve: (v: QuoteDetail) => void;
    mockGetQuote.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const { result, unmount } = renderHook(() => useQuoteDetail("q1"));
    expect(result.current.isLoading).toBe(true);
    unmount();
    act(() => { resolve!(baseQuote); });
    // Después de desmonte, isLoading debería seguir en true (no se actualizó)
    expect(result.current.isLoading).toBe(true);
  });
});

describe("useQuoteMutations", () => {
  beforeEach(() => {
    mockAuthorizeQuote.mockReset();
    mockCancelQuote.mockReset();
    mockConvertQuote.mockReset();
    mockUpdateQuote.mockReset();
  });

  it("authorize llama onChange con QuoteDetail", async () => {
    const authorized = { ...baseQuote, status: "authorized" as const };
    mockAuthorizeQuote.mockResolvedValue(authorized);
    const { result } = renderHook(() => useQuoteMutations());
    const onChange = jest.fn();
    await act(async () => { await result.current.authorize("q1", {}, onChange); });
    expect(onChange).toHaveBeenCalledWith(authorized);
    expect(onChange.mock.calls[0][0]).toMatchObject({ status: "authorized" });
  });

  it("cancel llama onChange con QuoteDetail cancelada", async () => {
    const cancelled = { ...baseQuote, status: "cancelled" as const };
    mockCancelQuote.mockResolvedValue(cancelled);
    const { result } = renderHook(() => useQuoteMutations());
    const onChange = jest.fn();
    await act(async () => { await result.current.cancel("q1", {}, onChange); });
    expect(onChange).toHaveBeenCalledWith(cancelled);
  });

  it("convert llama onChange con SaleDetail (tipo correcto)", async () => {
    mockConvertQuote.mockResolvedValue(baseSale);
    const { result } = renderHook(() => useQuoteMutations());
    const onChange = jest.fn();
    await act(async () => {
      await result.current.convert("q1", { folioId: "f2", paymentMethodId: "pm1" }, onChange);
    });
    expect(onChange).toHaveBeenCalledWith(baseSale);
    // Verifica que el tipo es Sale (tiene paymentMethodId y cashierId), no QuoteDetail
    expect(onChange.mock.calls[0][0]).toHaveProperty("paymentMethodId", "pm1");
    expect(onChange.mock.calls[0][0]).toHaveProperty("cashierId", "u1");
    expect(onChange.mock.calls[0][0]).toHaveProperty("status", "completed");
  });

  it("isSaving es true durante la mutación", async () => {
    let resolve: (v: QuoteDetail) => void;
    mockAuthorizeQuote.mockImplementation(() => new Promise((r) => { resolve = r; }));
    const { result } = renderHook(() => useQuoteMutations());
    let promise: Promise<void>;
    act(() => { promise = result.current.authorize("q1", {}); });
    expect(result.current.isSaving).toBe(true);
    await act(async () => { resolve!(baseQuote); await promise; });
    expect(result.current.isSaving).toBe(false);
  });

  it("update llama onChange con QuoteDetail actualizada", async () => {
    const updated = { ...baseQuote, status: "draft" as const };
    mockUpdateQuote.mockResolvedValue(updated);
    const { result } = renderHook(() => useQuoteMutations());
    const onChange = jest.fn();
    await act(async () => { await result.current.update("q1", {}, onChange); });
    expect(onChange).toHaveBeenCalledWith(updated);
  });
});
