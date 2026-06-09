import { renderHook, waitFor } from "@testing-library/react";

jest.mock("../../../../../../../app/_lib/authFetch", () => ({
  authFetch: jest.fn(),
}));

import { authFetch } from "../../../../../../../app/_lib/authFetch";
import { useDepartmentsOptions } from "../../../../../../../app/(private)/catalogs/products/_logic/hooks/useDepartmentsOptions";

const mockFetch = authFetch as jest.Mock;

const deptItems = [{ id: "d1", name: "Agrícola" }, { id: "d2", name: "Industrial" }];
const makeResponse = (items = deptItems) =>
  Promise.resolve({ ok: true, json: () => Promise.resolve({ items }) } as Response);

describe("useDepartmentsOptions", () => {
  beforeEach(() => jest.clearAllMocks());

  it("dos instancias simultáneas comparten la promesa (solo una llamada a authFetch)", async () => {
    mockFetch.mockReturnValue(makeResponse());

    const { result: r1 } = renderHook(() => useDepartmentsOptions());
    const { result: r2 } = renderHook(() => useDepartmentsOptions());

    await waitFor(() => expect(r1.current.isLoading).toBe(false));
    await waitFor(() => expect(r2.current.isLoading).toBe(false));

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(r1.current.options).toHaveLength(2);
    expect(r2.current.options).toHaveLength(2);
  });

  it("las opciones incluyen id y name de los departamentos", async () => {
    mockFetch.mockReturnValue(makeResponse());

    const { result } = renderHook(() => useDepartmentsOptions());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.options[0]).toEqual({ id: "d1", name: "Agrícola" });
    expect(result.current.options[1]).toEqual({ id: "d2", name: "Industrial" });
  });

  it("mientras el caché es válido, los renders adicionales no llaman a authFetch", async () => {
    // El caché fue poblado por los tests anteriores dentro del mismo módulo.
    // Montar el hook de nuevo no debe disparar otra llamada a authFetch.
    const callsBefore = mockFetch.mock.calls.length;

    const { result } = renderHook(() => useDepartmentsOptions());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockFetch).toHaveBeenCalledTimes(callsBefore);
    expect(result.current.options).toHaveLength(2);
  });
});
