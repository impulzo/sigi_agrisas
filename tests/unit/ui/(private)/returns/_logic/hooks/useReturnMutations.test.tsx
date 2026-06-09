/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import * as servicesModule from "../../../../../../../app/(private)/returns/_logic/services";
import {
  ReturnAlreadyCancelledError,
} from "../../../../../../../app/(private)/returns/_logic/errors";
import type { ReturnDetail } from "../../../../../../../app/(private)/returns/_logic/types/domain";

jest.mock("../../../../../../../app/(private)/returns/_logic/services");

import { useReturnMutations } from "../../../../../../../app/(private)/returns/_logic/hooks/useReturnMutations";

const NOW = new Date().toISOString();

function makeDetail(overrides = {}) {
  return {
    id: "r1",
    saleId: "s1",
    branchId: "b1",
    creatorId: "u1",
    status: "cancelled" as const,
    reason: "Defecto",
    refundTotal: 50,
    returnedAt: new Date(NOW),
    createdAt: new Date(NOW),
    updatedAt: new Date(NOW),
    items: [],
    ...overrides,
  };
}

describe("useReturnMutations — cancel", () => {
  beforeEach(() => jest.clearAllMocks());

  it("cancel() llama cancelReturn y dispara onChange en éxito", async () => {
    const updated = makeDetail();
    jest.spyOn(servicesModule, "cancelReturn").mockResolvedValue(updated);
    const onChange = jest.fn();
    const { result } = renderHook(() => useReturnMutations(onChange));

    let ret: unknown;
    await act(async () => { ret = await result.current.cancel("r1", "ya no lo quiero"); });

    expect(servicesModule.cancelReturn).toHaveBeenCalledWith("r1", { reason: "ya no lo quiero" });
    expect(onChange).toHaveBeenCalledWith(updated);
    expect(ret).toBe(updated);
    expect(result.current.isSaving).toBe(false);
    expect(result.current.mutationError).toBeNull();
  });

  it("cancel() NO llama onChange cuando falla", async () => {
    const err = new ReturnAlreadyCancelledError();
    jest.spyOn(servicesModule, "cancelReturn").mockRejectedValue(err);
    const onChange = jest.fn();
    const { result } = renderHook(() => useReturnMutations(onChange));

    let ret: unknown;
    await act(async () => { ret = await result.current.cancel("r1"); });

    expect(onChange).not.toHaveBeenCalled();
    expect(ret).toBeNull();
    expect(result.current.mutationError).toBe(err);
  });

  it("isSaving es true durante la operación", async () => {
    let resolveFn!: (v: ReturnDetail | PromiseLike<ReturnDetail>) => void;
    jest.spyOn(servicesModule, "cancelReturn").mockReturnValue(
      new Promise((r) => { resolveFn = r; })
    );
    const { result } = renderHook(() => useReturnMutations());
    act(() => { void result.current.cancel("r1"); });
    expect(result.current.isSaving).toBe(true);
    await act(async () => { resolveFn(makeDetail()); });
    expect(result.current.isSaving).toBe(false);
  });

  it("clearError() limpia mutationError", async () => {
    jest.spyOn(servicesModule, "cancelReturn").mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => useReturnMutations());
    await act(async () => { await result.current.cancel("r1"); });
    expect(result.current.mutationError).not.toBeNull();
    act(() => result.current.clearError());
    expect(result.current.mutationError).toBeNull();
  });
});

describe("useReturnMutations — create", () => {
  beforeEach(() => jest.clearAllMocks());

  it("create() llama createReturn y dispara onChange en éxito", async () => {
    const created = makeDetail({ status: "completed" });
    jest.spyOn(servicesModule, "createReturn").mockResolvedValue(created);
    const onChange = jest.fn();
    const { result } = renderHook(() => useReturnMutations(onChange));

    const body = {
      saleId: "s1",
      reason: "Defecto",
      returnedAt: NOW,
      items: [{ saleItemId: "si1", quantity: 1 }],
    };

    let ret: unknown;
    await act(async () => { ret = await result.current.create(body); });

    expect(servicesModule.createReturn).toHaveBeenCalledWith(body);
    expect(onChange).toHaveBeenCalledWith(created);
    expect(ret).toBe(created);
  });

  it("create() NO llama onChange cuando falla", async () => {
    jest.spyOn(servicesModule, "createReturn").mockRejectedValue(new Error("409"));
    const onChange = jest.fn();
    const { result } = renderHook(() => useReturnMutations(onChange));

    await act(async () => { await result.current.create({ saleId: "s1", reason: "x", returnedAt: NOW, items: [] }); });

    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.mutationError).not.toBeNull();
  });
});
