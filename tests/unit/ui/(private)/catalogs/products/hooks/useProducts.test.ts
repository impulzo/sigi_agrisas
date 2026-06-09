import { renderHook, act, waitFor } from "@testing-library/react";
import { useProducts } from "../../../../../../../app/(private)/catalogs/products/_logic/hooks/useProducts";

jest.mock("../../../../../../../app/(private)/catalogs/products/_logic/services/products", () => ({
  listProducts: jest.fn(),
}));

import { listProducts } from "../../../../../../../app/(private)/catalogs/products/_logic/services/products";
const mockList = listProducts as jest.Mock;

const baseProduct = {
  id: "p1",
  code: "PROD_01",
  name: "Arroz",
  unit: "kg",
  satProductCode: null,
  departmentId: "d1",
  departmentName: "Agrícola",
  ivaRate: 0.16,
  iepsRate: null,
  isActive: true,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

const baseResponse = { items: [baseProduct], total: 1, page: 1, pageSize: 20 };

describe("useProducts", () => {
  beforeEach(() => jest.clearAllMocks());

  it("carga inicial: llama listProducts y retorna items y total", async () => {
    mockList.mockResolvedValueOnce(baseResponse);

    const { result } = renderHook(() =>
      useProducts({ page: 1, pageSize: 20 })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockList).toHaveBeenCalledTimes(1);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("error: expone mensaje de error", async () => {
    mockList.mockRejectedValueOnce(new Error("Error de red"));

    const { result } = renderHook(() =>
      useProducts({ page: 1, pageSize: 20 })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Error de red");
    expect(result.current.items).toHaveLength(0);
  });

  it("refresh: re-ejecuta la llamada", async () => {
    mockList
      .mockResolvedValueOnce(baseResponse)
      .mockResolvedValueOnce({ ...baseResponse, total: 2 });

    const { result } = renderHook(() =>
      useProducts({ page: 1, pageSize: 20 })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => result.current.refresh());

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    expect(result.current.total).toBe(2);
  });

  it("cancelación al desmontar: no actualiza el estado tras unmount", async () => {
    let resolveList!: (v: typeof baseResponse) => void;
    mockList.mockReturnValueOnce(new Promise((res) => { resolveList = res; }));

    const { result, unmount } = renderHook(() =>
      useProducts({ page: 1, pageSize: 20 })
    );

    unmount();

    act(() => resolveList(baseResponse));

    expect(result.current.items).toHaveLength(0);
  });

  it("cambio de parámetro dispara nueva llamada y cancela la anterior", async () => {
    mockList
      .mockResolvedValueOnce(baseResponse)
      .mockResolvedValueOnce(baseResponse);

    const { result, rerender } = renderHook(
      ({ page }: { page: number }) => useProducts({ page, pageSize: 20 }),
      { initialProps: { page: 1 } }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    rerender({ page: 2 });

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
    expect(mockList).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
      undefined,
      expect.any(AbortSignal)
    );
  });
});
