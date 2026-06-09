/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react";

jest.mock("../../../../app/_lib/authFetch");

import * as authFetchModule from "../../../../app/_lib/authFetch";
import { useHeadquarters } from "../../../../app/_hooks/useHeadquarters";

const mockAuthFetch = authFetchModule.authFetch as jest.MockedFunction<typeof authFetchModule.authFetch>;

function makeResponse(items: object[]) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ items }),
    headers: new Headers(),
  } as Response);
}

describe("useHeadquarters", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("devuelve null cuando no hay sucursal con isHeadquarters=true", async () => {
    mockAuthFetch.mockReturnValue(makeResponse([
      { id: "b1", code: "S01", name: "Sucursal 1", isHeadquarters: false },
    ]));
    const { result } = renderHook(() => useHeadquarters());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hq).toBeNull();
  });

  it("devuelve la sucursal matriz cuando isHeadquarters=true", async () => {
    const { result } = renderHook(() => useHeadquarters());
    // Clear cache via refresh so we don't get cached result from previous test
    mockAuthFetch.mockReturnValue(makeResponse([
      { id: "b1", code: "S01", name: "Sucursal 1", isHeadquarters: false },
      { id: "hq", code: "HQ", name: "Matriz", isHeadquarters: true },
    ]));
    act(() => { result.current.refresh(); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hq).toEqual({ id: "hq", code: "HQ", name: "Matriz" });
  });

  it("devuelve null cuando fetch falla", async () => {
    const { result } = renderHook(() => useHeadquarters());
    mockAuthFetch.mockReturnValue(Promise.reject(new Error("Network error")));
    act(() => { result.current.refresh(); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hq).toBeNull();
  });

  it("refresh borra el caché y fuerza una nueva petición", async () => {
    // Set up mock BEFORE rendering so initial mount uses it
    mockAuthFetch.mockReturnValue(makeResponse([
      { id: "hq", code: "HQ", name: "Matriz", isHeadquarters: true },
    ]));
    const { result } = renderHook(() => useHeadquarters());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hq?.id).toBe("hq");
    expect(mockAuthFetch).toHaveBeenCalledTimes(1);

    // Refresh with different data — should make a second fetch
    mockAuthFetch.mockReturnValue(makeResponse([]));
    act(() => { result.current.refresh(); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hq).toBeNull();
    expect(mockAuthFetch).toHaveBeenCalledTimes(2);
  });
});
