/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor, act } from "@testing-library/react";
import { useRoles } from "../../../../../app/(private)/roles/_logic/hooks/useRoles";

jest.mock("../../../../../app/(private)/roles/_logic/services/listRoles");
import { listRoles } from "../../../../../app/(private)/roles/_logic/services/listRoles";
const mockListRoles = listRoles as jest.MockedFunction<typeof listRoles>;

const fakeRoles = [
  { id: "1", name: "admin", description: "Admin", createdAt: "", updatedAt: "" },
  { id: "2", name: "viewer", description: null, createdAt: "", updatedAt: "" },
];

describe("useRoles", () => {
  beforeEach(() => jest.clearAllMocks());

  it("calls listRoles once on mount and exposes roles", async () => {
    mockListRoles.mockResolvedValueOnce(fakeRoles);
    const { result } = renderHook(() => useRoles());
    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.roles).toEqual(fakeRoles);
    expect(mockListRoles).toHaveBeenCalledTimes(1);
  });

  it("populates error on fetch failure", async () => {
    mockListRoles.mockRejectedValueOnce(new Error("Network error"));
    const { result } = renderHook(() => useRoles());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeTruthy();
    expect(result.current.roles).toEqual([]);
  });

  it("refresh() re-invokes the service", async () => {
    mockListRoles.mockResolvedValue(fakeRoles);
    const { result } = renderHook(() => useRoles());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListRoles).toHaveBeenCalledTimes(1);
    act(() => { result.current.refresh(); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(mockListRoles).toHaveBeenCalledTimes(2);
  });
});
