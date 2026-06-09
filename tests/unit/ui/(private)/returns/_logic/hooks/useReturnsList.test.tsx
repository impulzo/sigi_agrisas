/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import * as servicesModule from "../../../../../../../app/(private)/returns/_logic/services";

jest.mock("../../../../../../../app/(private)/returns/_logic/services");

import { useReturnsList } from "../../../../../../../app/(private)/returns/_logic/hooks/useReturnsList";

const NOW = new Date().toISOString();

function makeResult(overrides = {}) {
  return {
    items: [
      {
        id: "r1",
        saleId: "s1",
        branchId: "b1",
        creatorId: "u1",
        status: "completed" as const,
        reason: "Defecto",
        refundTotal: 50,
        returnedAt: new Date(NOW),
        createdAt: new Date(NOW),
        updatedAt: new Date(NOW),
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
    ...overrides,
  };
}

const baseFilters = {
  page: 1,
  pageSize: 20,
  status: [] as string[],
  search: "",
};

describe("useReturnsList", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("llama listReturns al montar y actualiza state", async () => {
    jest.spyOn(servicesModule, "listReturns").mockResolvedValue(makeResult());
    const { result } = renderHook(() => useReturnsList(baseFilters as never));

    expect(result.current.isLoading).toBe(true);

    await act(async () => { jest.runAllTimers(); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(servicesModule.listReturns).toHaveBeenCalledTimes(1);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(1);
  });

  it("search < 2 chars → llama con search vacío", async () => {
    jest.spyOn(servicesModule, "listReturns").mockResolvedValue(makeResult({ items: [], total: 0 }));
    const { result } = renderHook(() =>
      useReturnsList({ ...baseFilters, search: "a" } as never)
    );

    // sin debounce, search corto → debouncedSearch permanece vacío
    await act(async () => { jest.runAllTimers(); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(servicesModule.listReturns).toHaveBeenCalledWith(
      expect.objectContaining({ search: "" }),
    );
  });

  it("search >= 2 chars después del debounce → llama con el valor", async () => {
    jest.spyOn(servicesModule, "listReturns").mockResolvedValue(makeResult({ items: [], total: 0 }));
    const { result, rerender } = renderHook(
      ({ search }: { search: string }) => useReturnsList({ ...baseFilters, search } as never),
      { initialProps: { search: "" } },
    );

    await act(async () => { jest.runAllTimers(); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const callsBefore = (servicesModule.listReturns as jest.Mock).mock.calls.length;

    rerender({ search: "de" });
    // antes del debounce no debe haber nuevo fetch
    expect((servicesModule.listReturns as jest.Mock).mock.calls.length).toBe(callsBefore);

    // avanzamos 300ms → debounce se dispara
    await act(async () => { jest.advanceTimersByTime(300); });
    await waitFor(() =>
      expect(servicesModule.listReturns).toHaveBeenCalledWith(
        expect.objectContaining({ search: "de" }),
      )
    );
  });

  it("refresh() vuelve a invocar el servicio", async () => {
    const spy = jest.spyOn(servicesModule, "listReturns").mockResolvedValue(makeResult());
    const { result } = renderHook(() => useReturnsList(baseFilters as never));

    await act(async () => { jest.runAllTimers(); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const callsBefore = spy.mock.calls.length;

    act(() => result.current.refresh());
    await act(async () => { jest.runAllTimers(); });
    await waitFor(() => expect(spy.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it("error de fetch → setea error y deja de cargar", async () => {
    const err = new Error("Network failure");
    jest.spyOn(servicesModule, "listReturns").mockRejectedValue(err);
    const { result } = renderHook(() => useReturnsList(baseFilters as never));

    await act(async () => { jest.runAllTimers(); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe(err);
    expect(result.current.items).toHaveLength(0);
  });

  it("AbortError ignorado — no setea error", async () => {
    const abortErr = Object.assign(new Error("aborted"), { name: "AbortError" });
    jest.spyOn(servicesModule, "listReturns").mockRejectedValue(abortErr);
    const { result } = renderHook(() => useReturnsList(baseFilters as never));

    await act(async () => { jest.runAllTimers(); });
    // debe seguir en isLoading (o quedar en false con error=null)
    await act(async () => { jest.runAllTimers(); });
    expect(result.current.error).toBeNull();
  });
});
