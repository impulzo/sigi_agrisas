import { renderHook, act, waitFor } from "@testing-library/react";
import { usePaymentMethods } from "../../../../../../../app/(private)/catalogs/payment-methods/_logic/hooks/usePaymentMethods";

jest.mock("../../../../../../../app/(private)/catalogs/payment-methods/_logic/services/listPaymentMethods", () => ({
  listPaymentMethods: jest.fn(),
}));

import { listPaymentMethods } from "../../../../../../../app/(private)/catalogs/payment-methods/_logic/services/listPaymentMethods";
const mockList = listPaymentMethods as jest.Mock;

const baseItem = {
  id: "pm-1",
  code: "CASH",
  name: "Efectivo",
  description: null,
  isActive: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-06-01"),
};

describe("usePaymentMethods", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("carga inicial: llama listPaymentMethods y retorna items y total", async () => {
    mockList.mockResolvedValueOnce({ items: [baseItem], total: 1, page: 1, pageSize: 20 });

    const { result } = renderHook(() => usePaymentMethods({ page: 1, pageSize: 20 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockList).toHaveBeenCalledWith({ page: 1, pageSize: 20, includeInactive: undefined });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("cambio de página: re-fetch con nueva página", async () => {
    mockList
      .mockResolvedValueOnce({ items: [baseItem], total: 2, page: 1, pageSize: 20 })
      .mockResolvedValueOnce({ items: [], total: 2, page: 2, pageSize: 20 });

    const { result, rerender } = renderHook(
      ({ page }: { page: number }) => usePaymentMethods({ page, pageSize: 20 }),
      { initialProps: { page: 1 } }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ page: 2 });

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    expect(mockList).toHaveBeenLastCalledWith({ page: 2, pageSize: 20, includeInactive: undefined });
  });

  it("toggle includeInactive: re-fetch con includeInactive=true", async () => {
    mockList
      .mockResolvedValueOnce({ items: [baseItem], total: 1, page: 1, pageSize: 20 })
      .mockResolvedValueOnce({ items: [baseItem], total: 2, page: 1, pageSize: 20 });

    const { result, rerender } = renderHook(
      ({ includeInactive }: { includeInactive?: boolean }) =>
        usePaymentMethods({ page: 1, pageSize: 20, includeInactive }),
      { initialProps: { includeInactive: undefined as boolean | undefined } }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ includeInactive: true });

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    expect(mockList).toHaveBeenLastCalledWith({ page: 1, pageSize: 20, includeInactive: true });
  });

  it("refresh: re-fetch", async () => {
    mockList
      .mockResolvedValueOnce({ items: [baseItem], total: 1, page: 1, pageSize: 20 })
      .mockResolvedValueOnce({ items: [baseItem], total: 1, page: 1, pageSize: 20 });

    const { result } = renderHook(() => usePaymentMethods({ page: 1, pageSize: 20 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  });

  it("error: muestra error string", async () => {
    mockList.mockRejectedValueOnce(new Error("Error al cargar"));

    const { result } = renderHook(() => usePaymentMethods({ page: 1, pageSize: 20 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Error al cargar");
    expect(result.current.items).toHaveLength(0);
  });

  it("cancelación al desmontar: no actualiza state", async () => {
    let resolveList!: (value: unknown) => void;
    mockList.mockReturnValueOnce(new Promise((res) => { resolveList = res; }));

    const { result, unmount } = renderHook(() => usePaymentMethods({ page: 1, pageSize: 20 }));

    unmount();

    act(() => {
      resolveList({ items: [baseItem], total: 1, page: 1, pageSize: 20 });
    });

    expect(result.current.items).toHaveLength(0);
  });
});
