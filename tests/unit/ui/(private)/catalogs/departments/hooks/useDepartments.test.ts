import { renderHook, act, waitFor } from "@testing-library/react";
import { useDepartments } from "../../../../../../../app/(private)/catalogs/departments/_logic/hooks/useDepartments";

jest.mock("../../../../../../../app/(private)/catalogs/departments/_logic/services/listDepartments", () => ({
  listDepartments: jest.fn(),
}));

import { listDepartments } from "../../../../../../../app/(private)/catalogs/departments/_logic/services/listDepartments";
const mockList = listDepartments as jest.Mock;

const baseItem = {
  id: "1",
  code: "SALES",
  name: "Ventas",
  description: "Departamento de ventas",
  isActive: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("useDepartments", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("carga inicial: llama listDepartments y retorna items y total", async () => {
    mockList.mockResolvedValueOnce({ items: [baseItem], total: 1, page: 1, pageSize: 20 });

    const { result } = renderHook(() => useDepartments({ page: 1, pageSize: 20 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockList).toHaveBeenCalledWith({ page: 1, pageSize: 20, includeInactive: undefined });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("error: muestra error string", async () => {
    mockList.mockRejectedValueOnce(new Error("Error al cargar"));

    const { result } = renderHook(() => useDepartments({ page: 1, pageSize: 20 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Error al cargar");
    expect(result.current.items).toHaveLength(0);
  });

  it("refresh: re-fetch", async () => {
    mockList
      .mockResolvedValueOnce({ items: [baseItem], total: 1, page: 1, pageSize: 20 })
      .mockResolvedValueOnce({ items: [baseItem], total: 1, page: 1, pageSize: 20 });

    const { result } = renderHook(() => useDepartments({ page: 1, pageSize: 20 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  });

  it("cancelación al desmontar: no actualiza state", async () => {
    let resolveList!: (value: unknown) => void;
    mockList.mockReturnValueOnce(new Promise((res) => { resolveList = res; }));

    const { result, unmount } = renderHook(() => useDepartments({ page: 1, pageSize: 20 }));

    unmount();

    act(() => {
      resolveList({ items: [baseItem], total: 1, page: 1, pageSize: 20 });
    });

    expect(result.current.items).toHaveLength(0);
  });
});
