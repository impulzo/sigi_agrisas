/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";

jest.mock("../../../../app/_lib/authFetch");

import * as authFetchModule from "../../../../app/_lib/authFetch";
import { useSatCodesSearch } from "../../../../app/_hooks/useSatCodesSearch";

const mockAuthFetch = authFetchModule.authFetch as jest.MockedFunction<typeof authFetchModule.authFetch>;

function makeResponse(items: object[]) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ items }),
    headers: new Headers(),
  } as Response);
}

const CODES = [
  { code: "10171601", description: "Fertilizante nitrogenado" },
  { code: "10171602", description: "Fertilizante de potasio" },
];

describe("useSatCodesSearch", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("con menos de 2 caracteres no llama al endpoint y no expone opciones", () => {
    const { result } = renderHook(() => useSatCodesSearch("f"));
    act(() => { jest.advanceTimersByTime(400); });

    expect(mockAuthFetch).not.toHaveBeenCalled();
    expect(result.current.options).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("con 2+ caracteres consulta ?search= tras el debounce y expone las sugerencias", async () => {
    mockAuthFetch.mockReturnValue(makeResponse(CODES));
    const { result } = renderHook(() => useSatCodesSearch("fertilizante"));

    expect(mockAuthFetch).not.toHaveBeenCalled();
    act(() => { jest.advanceTimersByTime(300); });
    expect(mockAuthFetch).toHaveBeenCalledWith("/api/v1/admin/sat-codes?search=fertilizante");

    await act(async () => { await Promise.resolve(); });
    expect(result.current.options).toEqual(CODES);
    expect(result.current.isLoading).toBe(false);
  });

  it("encodes el query y tolera error de red sin opciones", async () => {
    mockAuthFetch.mockReturnValue(Promise.reject(new Error("network")));
    const { result } = renderHook(() => useSatCodesSearch("ab c"));

    act(() => { jest.advanceTimersByTime(300); });
    expect(mockAuthFetch).toHaveBeenCalledWith("/api/v1/admin/sat-codes?search=ab%20c");

    await act(async () => { await Promise.resolve(); });
    expect(result.current.options).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("cada cambio de query re-dispara la búsqueda (sin limpiar el timer previo)", () => {
    mockAuthFetch.mockReturnValue(makeResponse(CODES));
    const { rerender } = renderHook((q: string) => useSatCodesSearch(q), { initialProps: "a" });

    rerender("fer");
    act(() => { jest.advanceTimersByTime(300); });
    expect(mockAuthFetch).toHaveBeenCalledTimes(1);
    expect(mockAuthFetch).toHaveBeenCalledWith("/api/v1/admin/sat-codes?search=fer");

    rerender("fertilizante");
    act(() => { jest.advanceTimersByTime(300); });
    expect(mockAuthFetch).toHaveBeenCalledTimes(2);
    expect(mockAuthFetch).toHaveBeenLastCalledWith("/api/v1/admin/sat-codes?search=fertilizante");
  });
});
