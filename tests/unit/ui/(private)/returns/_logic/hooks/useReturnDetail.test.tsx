/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import * as servicesModule from "../../../../../../../app/(private)/returns/_logic/services";
import { ReturnNotFoundError } from "../../../../../../../app/(private)/returns/_logic/errors";

jest.mock("../../../../../../../app/(private)/returns/_logic/services");

import { useReturnDetail } from "../../../../../../../app/(private)/returns/_logic/hooks/useReturnDetail";

const NOW = new Date().toISOString();

function makeDetail() {
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
    items: [],
  };
}

describe("useReturnDetail", () => {
  beforeEach(() => jest.clearAllMocks());

  it("carga el detalle al montar", async () => {
    jest.spyOn(servicesModule, "getReturn").mockResolvedValue(makeDetail());
    const { result } = renderHook(() => useReturnDetail("r1"));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.returnDetail?.id).toBe("r1");
    expect(result.current.error).toBeNull();
  });

  it("mapea error 404 → ReturnNotFoundError", async () => {
    const err = new ReturnNotFoundError();
    jest.spyOn(servicesModule, "getReturn").mockRejectedValue(err);
    const { result } = renderHook(() => useReturnDetail("x"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBeInstanceOf(ReturnNotFoundError);
    expect(result.current.returnDetail).toBeNull();
  });

  it("refresh() vuelve a invocar getReturn", async () => {
    const spy = jest.spyOn(servicesModule, "getReturn").mockResolvedValue(makeDetail());
    const { result } = renderHook(() => useReturnDetail("r1"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    act(() => result.current.refresh());
    await waitFor(() => expect(spy).toHaveBeenCalledTimes(2));
  });

  it("recarga cuando cambia el id", async () => {
    const spy = jest.spyOn(servicesModule, "getReturn").mockResolvedValue(makeDetail());
    const { rerender } = renderHook(({ id }: { id: string }) => useReturnDetail(id), {
      initialProps: { id: "r1" },
    });
    await waitFor(() => expect(spy).toHaveBeenCalledWith("r1"));
    rerender({ id: "r2" });
    await waitFor(() => expect(spy).toHaveBeenCalledWith("r2"));
  });

  it("AbortError ignorado — no setea error", async () => {
    const abortErr = Object.assign(new Error("aborted"), { name: "AbortError" });
    jest.spyOn(servicesModule, "getReturn").mockRejectedValue(abortErr);
    const { result } = renderHook(() => useReturnDetail("r1"));

    await act(async () => {});
    expect(result.current.error).toBeNull();
  });
});
