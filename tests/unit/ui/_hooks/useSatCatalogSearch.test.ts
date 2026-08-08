/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";

jest.mock("../../../../app/_lib/authFetch");

import * as authFetchModule from "../../../../app/_lib/authFetch";
import { useSatCatalogSearch } from "../../../../app/_hooks/useSatCatalogSearch";

const mockAuthFetch = authFetchModule.authFetch as jest.MockedFunction<typeof authFetchModule.authFetch>;

function makeResponse(items: object[]) {
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ items }),
    headers: new Headers(),
  } as Response);
}

const REGIMES = [
  { code: "601", description: "General de Ley Personas Morales" },
  { code: "612", description: "Personas Físicas con Actividades Empresariales y Profesionales" },
];

const USES = [
  { code: "G03", description: "Gastos en general." },
  { code: "CP01", description: "Pagos" },
];

describe("useSatCatalogSearch", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it("con menos de 2 caracteres no llama al endpoint y no expone opciones", () => {
    const { result } = renderHook(() => useSatCatalogSearch("regimen-fiscal", "6"));
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(mockAuthFetch).not.toHaveBeenCalled();
    expect(result.current.options).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("consulta el endpoint parametrizado por catálogo tras el debounce", async () => {
    mockAuthFetch.mockReturnValue(makeResponse(REGIMES));
    const { result } = renderHook(() => useSatCatalogSearch("regimen-fiscal", "simplificado"));

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(mockAuthFetch).toHaveBeenCalledWith(
      "/api/v1/admin/sat-codes/regimen-fiscal?search=simplificado"
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.options).toEqual(REGIMES);
    expect(result.current.isLoading).toBe(false);
  });

  it("apunta al catálogo de uso CFDI cuando se indica", async () => {
    mockAuthFetch.mockReturnValue(makeResponse(USES));
    const { result } = renderHook(() => useSatCatalogSearch("uso-cfdi", "CP01"));

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(mockAuthFetch).toHaveBeenCalledWith("/api/v1/admin/sat-codes/uso-cfdi?search=CP01");

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.options).toEqual(USES);
  });

  it("codifica el query y tolera error de red sin opciones", async () => {
    mockAuthFetch.mockReturnValue(Promise.reject(new Error("network")));
    const { result } = renderHook(() => useSatCatalogSearch("regimen-fiscal", "ab c"));

    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(mockAuthFetch).toHaveBeenCalledWith(
      "/api/v1/admin/sat-codes/regimen-fiscal?search=ab%20c"
    );

    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.options).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });

  it("cada cambio de query re-dispara la búsqueda (sin limpiar el timer previo)", () => {
    mockAuthFetch.mockReturnValue(makeResponse(REGIMES));
    const { rerender } = renderHook((q: string) => useSatCatalogSearch("regimen-fiscal", q), {
      initialProps: "a",
    });

    rerender("per");
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(mockAuthFetch).toHaveBeenCalledTimes(1);
    expect(mockAuthFetch).toHaveBeenCalledWith(
      "/api/v1/admin/sat-codes/regimen-fiscal?search=per"
    );

    rerender("personas");
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(mockAuthFetch).toHaveBeenCalledTimes(2);
    expect(mockAuthFetch).toHaveBeenLastCalledWith(
      "/api/v1/admin/sat-codes/regimen-fiscal?search=personas"
    );
  });
});
