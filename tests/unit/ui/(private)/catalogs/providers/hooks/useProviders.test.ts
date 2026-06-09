import { renderHook, act, waitFor } from "@testing-library/react";
import { useProviders } from "../../../../../../../app/(private)/catalogs/providers/_logic/hooks/useProviders";

jest.mock("../../../../../../../app/(private)/catalogs/providers/_logic/services/listProviders", () => ({
  listProviders: jest.fn(),
}));

import { listProviders } from "../../../../../../../app/(private)/catalogs/providers/_logic/services/listProviders";
const mockList = listProviders as jest.Mock;

const baseItem = {
  id: "1",
  code: "PROV_001",
  name: "Semillas ACME",
  rfc: "SAC120101A12",
  legalName: null,
  taxRegime: null,
  cfdiUse: null,
  taxZipCode: null,
  email: null,
  phone: null,
  address: null,
  contactName: null,
  notes: null,
  isActive: true,
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

describe("useProviders", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("initial load: calls listProviders and returns items and total", async () => {
    mockList.mockResolvedValueOnce({ items: [baseItem], total: 1, page: 1, pageSize: 20 });

    const { result } = renderHook(() => useProviders({ page: 1, pageSize: 20 }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockList).toHaveBeenCalled();
    const [firstArg] = mockList.mock.calls[0];
    expect(firstArg).toMatchObject({ page: 1, pageSize: 20 });
    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(1);
    expect(result.current.error).toBeNull();
  });

  it("refetches when search changes", async () => {
    mockList
      .mockResolvedValueOnce({ items: [baseItem], total: 1, page: 1, pageSize: 20 })
      .mockResolvedValueOnce({ items: [baseItem], total: 1, page: 1, pageSize: 20 });

    const { result, rerender } = renderHook(
      ({ search }: { search: string | undefined }) => useProviders({ page: 1, pageSize: 20, search }),
      { initialProps: { search: undefined as string | undefined } },
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockList).toHaveBeenCalledTimes(1);

    rerender({ search: "acme" });
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));

    const secondCall = mockList.mock.calls[1][0];
    expect(secondCall.search).toBe("acme");
  });

  it("refetches when includeInactive toggles", async () => {
    mockList
      .mockResolvedValueOnce({ items: [], total: 0, page: 1, pageSize: 20 })
      .mockResolvedValueOnce({ items: [baseItem], total: 1, page: 1, pageSize: 20 });

    const { rerender } = renderHook(
      ({ includeInactive }: { includeInactive: boolean }) =>
        useProviders({ page: 1, pageSize: 20, includeInactive }),
      { initialProps: { includeInactive: false } },
    );

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1));
    rerender({ includeInactive: true });
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  });

  it("refresh: re-fetches with same params", async () => {
    mockList
      .mockResolvedValueOnce({ items: [baseItem], total: 1, page: 1, pageSize: 20 })
      .mockResolvedValueOnce({ items: [baseItem], total: 1, page: 1, pageSize: 20 });

    const { result } = renderHook(() => useProviders({ page: 1, pageSize: 20 }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2));
  });

  it("error state on rejection", async () => {
    mockList.mockRejectedValueOnce(new Error("Boom"));

    const { result } = renderHook(() => useProviders({ page: 1, pageSize: 20 }));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBe("Boom");
    expect(result.current.items).toHaveLength(0);
  });

  it("unmount cancels pending fetch (no state update)", async () => {
    let resolveList!: (value: unknown) => void;
    mockList.mockReturnValueOnce(new Promise((res) => { resolveList = res; }));

    const { result, unmount } = renderHook(() => useProviders({ page: 1, pageSize: 20 }));
    unmount();

    act(() => {
      resolveList({ items: [baseItem], total: 1, page: 1, pageSize: 20 });
    });

    expect(result.current.items).toHaveLength(0);
  });
});
