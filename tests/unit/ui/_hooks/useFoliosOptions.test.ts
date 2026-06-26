/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react";

jest.mock("../../../../app/_lib/authFetch");

import * as authFetchModule from "../../../../app/_lib/authFetch";
import { useFoliosOptions } from "../../../../app/_hooks/useFoliosOptions";

const mockAuthFetch = authFetchModule.authFetch as jest.MockedFunction<typeof authFetchModule.authFetch>;

function makeResponse(items: object[]) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ items }),
    headers: new Headers(),
  } as Response);
}

const FOLIO_TK = { id: "f-tk", code: "TK", name: "Folio TK", prefix: "TK-", scope: "POS", currentNumber: 0, isActive: true };
const FOLIO_RB = { id: "f-rb", code: "RB", name: "Recibo", prefix: "RB-", scope: "OPERATIONS", currentNumber: 5, isActive: true };

describe("useFoliosOptions", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("sin scope llama a /folios sin query param de scope", async () => {
    mockAuthFetch.mockReturnValue(makeResponse([FOLIO_TK, FOLIO_RB]));
    const { result } = renderHook(() => useFoliosOptions());
    act(() => { result.current.refresh(); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockAuthFetch).toHaveBeenCalledWith(expect.stringContaining("/api/v1/admin/folios"));
    const url: string = (mockAuthFetch.mock.calls[0] as [string])[0];
    expect(url).not.toContain("scope=");
    expect(result.current.options).toHaveLength(2);
  });

  it("scope=POS llama con ?scope=POS en la URL", async () => {
    mockAuthFetch.mockReturnValue(makeResponse([FOLIO_TK]));
    const { result } = renderHook(() => useFoliosOptions({ scope: "POS" }));
    act(() => { result.current.refresh(); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const url: string = (mockAuthFetch.mock.calls[0] as [string])[0];
    expect(url).toContain("scope=POS");
    expect(result.current.options).toHaveLength(1);
    expect(result.current.options[0].code).toBe("TK");
  });

  it("scope=OPERATIONS llama con ?scope=OPERATIONS en la URL", async () => {
    mockAuthFetch.mockReturnValue(makeResponse([FOLIO_RB]));
    const { result } = renderHook(() => useFoliosOptions({ scope: "OPERATIONS" }));
    act(() => { result.current.refresh(); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const url: string = (mockAuthFetch.mock.calls[0] as [string])[0];
    expect(url).toContain("scope=OPERATIONS");
    expect(result.current.options[0].code).toBe("RB");
  });

  it("mapea scope desde el DTO en las opciones retornadas", async () => {
    mockAuthFetch.mockReturnValue(makeResponse([FOLIO_TK]));
    const { result } = renderHook(() => useFoliosOptions({ scope: "POS" }));
    act(() => { result.current.refresh(); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.options[0].scope).toBe("POS");
  });

  it("refresh borra cache del scope actual y fuerza re-fetch", async () => {
    mockAuthFetch
      .mockReturnValueOnce(makeResponse([FOLIO_TK]))
      .mockReturnValueOnce(makeResponse([]));

    const { result } = renderHook(() => useFoliosOptions({ scope: "POS" }));
    act(() => { result.current.refresh(); });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.options).toHaveLength(1);

    act(() => { result.current.refresh(); });
    await waitFor(() => expect(result.current.options).toHaveLength(0));

    expect(mockAuthFetch).toHaveBeenCalledTimes(2);
  });
});
