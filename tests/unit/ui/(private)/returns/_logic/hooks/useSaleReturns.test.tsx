/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import * as servicesModule from "../../../../../../../app/(private)/returns/_logic/services";
import { SaleNotFoundError } from "../../../../../../../app/(private)/returns/_logic/errors";

jest.mock("../../../../../../../app/(private)/returns/_logic/services");

import { useSaleReturns } from "../../../../../../../app/(private)/returns/_logic/hooks/useSaleReturns";

const NOW = new Date().toISOString();
function makeReturn() {
  return {
    id: "r1",
    saleId: "s1",
    branchId: "b1",
    creatorId: "u1",
    status: "completed" as const,
    reason: "Defecto",
    refundTotal: 50,
    returnedAt: new Date(NOW),
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
  };
}

describe("useSaleReturns", () => {
  beforeEach(() => jest.clearAllMocks());

  it("carga las devoluciones al montar", async () => {
    jest.spyOn(servicesModule, "listSaleReturns").mockResolvedValue([makeReturn()]);
    const { result } = renderHook(() => useSaleReturns("s1"));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.returns).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it("venta sin devoluciones → devuelve array vacío", async () => {
    jest.spyOn(servicesModule, "listSaleReturns").mockResolvedValue([]);
    const { result } = renderHook(() => useSaleReturns("s2"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.returns).toEqual([]);
  });

  it("refresh() vuelve a invocar el servicio", async () => {
    const spy = jest.spyOn(servicesModule, "listSaleReturns").mockResolvedValue([makeReturn()]);
    const { result } = renderHook(() => useSaleReturns("s1"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.refresh());
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });

  it("error → setea error y deja de cargar", async () => {
    const err = new SaleNotFoundError();
    jest.spyOn(servicesModule, "listSaleReturns").mockRejectedValue(err);
    const { result } = renderHook(() => useSaleReturns("x"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(SaleNotFoundError);
  });
});
