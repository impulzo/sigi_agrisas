import { renderHook, act, waitFor } from "@testing-library/react";
import { useFolios } from "../../../../../../../app/(private)/catalogs/folios/_logic/hooks/useFolios";

jest.mock("../../../../../../../app/(private)/catalogs/folios/_logic/services/listFolios", () => ({
  listFolios: jest.fn(),
}));

import { listFolios } from "../../../../../../../app/(private)/catalogs/folios/_logic/services/listFolios";
const mockList = listFolios as jest.Mock;

const baseItem = {
  id: "1",
  code: "FAC",
  name: "Factura",
  prefix: "FAC-",
  scope: "OPERATIONS" as const,
  currentNumber: 1,
  isActive: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("useFolios", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("carga inicial: llama listFolios y retorna items y total", async () => {
    mockList.mockResolvedValueOnce({ items: [baseItem], total: 1, page: 1, pageSize: 20 });

    const { result } = renderHook(() => useFolios({ page: 1, pageSize: 20 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockList).toHaveBeenCalledWith({ page: 1, pageSize: 20, includeInactive: undefined });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("error: muestra error string", async () => {
    mockList.mockRejectedValueOnce(new Error("Error al cargar"));

    const { result } = renderHook(() => useFolios({ page: 1, pageSize: 20 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Error al cargar");
    expect(result.current.items).toHaveLength(0);
  });

  it("refresh: re-fetch", async () => {
    mockList
      .mockResolvedValueOnce({ items: [baseItem], total: 1, page: 1, pageSize: 20 })
      .mockResolvedValueOnce({ items: [baseItem], total: 1, page: 1, pageSize: 20 });

    const { result } = renderHook(() => useFolios({ page: 1, pageSize: 20 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  });

  it("cancelación al desmontar: no actualiza state", async () => {
    let resolveList!: (value: unknown) => void;
    mockList.mockReturnValueOnce(new Promise((res) => { resolveList = res; }));

    const { result, unmount } = renderHook(() => useFolios({ page: 1, pageSize: 20 }));

    unmount();

    act(() => {
      resolveList({ items: [baseItem], total: 1, page: 1, pageSize: 20 });
    });

    expect(result.current.items).toHaveLength(0);
  });
});
