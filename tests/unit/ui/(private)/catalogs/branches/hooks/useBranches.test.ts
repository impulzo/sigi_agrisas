import { renderHook, act, waitFor } from "@testing-library/react";
import { useBranches } from "../../../../../../../app/(private)/catalogs/branches/_logic/hooks/useBranches";

jest.mock("../../../../../../../app/(private)/catalogs/branches/_logic/services/listBranches", () => ({
  listBranches: jest.fn(),
}));

import { listBranches } from "../../../../../../../app/(private)/catalogs/branches/_logic/services/listBranches";
const mockList = listBranches as jest.Mock;

const baseItem = {
  id: "1",
  code: "MAIN",
  name: "Central",
  address: "Calle 1",
  phone: "555-0000",
  email: "main@example.com",
  isActive: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("useBranches", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("carga inicial: llama listBranches y retorna items y total", async () => {
    mockList.mockResolvedValueOnce({ items: [baseItem], total: 1, page: 1, pageSize: 20 });

    const { result } = renderHook(() => useBranches({ page: 1, pageSize: 20 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockList).toHaveBeenCalledWith({ page: 1, pageSize: 20, includeInactive: undefined });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("error: muestra error string", async () => {
    mockList.mockRejectedValueOnce(new Error("Error al cargar"));

    const { result } = renderHook(() => useBranches({ page: 1, pageSize: 20 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Error al cargar");
    expect(result.current.items).toHaveLength(0);
  });

  it("refresh: re-fetch", async () => {
    mockList
      .mockResolvedValueOnce({ items: [baseItem], total: 1, page: 1, pageSize: 20 })
      .mockResolvedValueOnce({ items: [baseItem], total: 1, page: 1, pageSize: 20 });

    const { result } = renderHook(() => useBranches({ page: 1, pageSize: 20 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  });

  it("cancelación al desmontar: no actualiza state", async () => {
    let resolveList!: (value: unknown) => void;
    mockList.mockReturnValueOnce(new Promise((res) => { resolveList = res; }));

    const { result, unmount } = renderHook(() => useBranches({ page: 1, pageSize: 20 }));

    unmount();

    act(() => {
      resolveList({ items: [baseItem], total: 1, page: 1, pageSize: 20 });
    });

    expect(result.current.items).toHaveLength(0);
  });
});
