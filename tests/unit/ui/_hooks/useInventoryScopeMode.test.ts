/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react";

jest.mock("../../../../app/_lib/authFetch");

import * as authFetchModule from "../../../../app/_lib/authFetch";
import { useInventoryScopeMode } from "../../../../app/_hooks/useInventoryScopeMode";

const mockAuthFetch = authFetchModule.authFetch as jest.MockedFunction<typeof authFetchModule.authFetch>;

function makeResponse(mode: string) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ mode }),
    headers: new Headers(),
  } as Response);
}

describe("useInventoryScopeMode", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("devuelve 'general' cuando el backend responde general", async () => {
    mockAuthFetch.mockReturnValue(makeResponse("general"));
    const { result } = renderHook(() => useInventoryScopeMode());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.mode).toBe("general");
  });

  it("devuelve 'branch' cuando el backend responde branch", async () => {
    const { result } = renderHook(() => useInventoryScopeMode());
    mockAuthFetch.mockReturnValue(makeResponse("branch"));
    act(() => { result.current.refresh(); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.mode).toBe("branch");
  });

  it("cae a 'general' cuando fetch falla", async () => {
    const { result } = renderHook(() => useInventoryScopeMode());
    mockAuthFetch.mockReturnValue(Promise.reject(new Error("Network error")));
    act(() => { result.current.refresh(); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.mode).toBe("general");
  });

  it("cachea la respuesta y no repite fetch dentro del TTL", async () => {
    mockAuthFetch.mockReturnValue(makeResponse("branch"));
    const { result } = renderHook(() => useInventoryScopeMode());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.mode).toBe("branch");
    expect(mockAuthFetch).toHaveBeenCalledTimes(1);

    const { result: result2 } = renderHook(() => useInventoryScopeMode());
    await waitFor(() => expect(result2.current.isLoading).toBe(false));
    expect(result2.current.mode).toBe("branch");
    expect(mockAuthFetch).toHaveBeenCalledTimes(1);
  });

  it("refresh borra el caché y fuerza una nueva petición", async () => {
    mockAuthFetch.mockReturnValue(makeResponse("branch"));
    const { result } = renderHook(() => useInventoryScopeMode());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const callsBeforeRefresh = mockAuthFetch.mock.calls.length;

    mockAuthFetch.mockReturnValue(makeResponse("general"));
    act(() => { result.current.refresh(); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.mode).toBe("general");
    expect(mockAuthFetch.mock.calls.length).toBe(callsBeforeRefresh + 1);
  });
});
