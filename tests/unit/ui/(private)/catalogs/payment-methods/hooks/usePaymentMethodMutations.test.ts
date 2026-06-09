import { renderHook, act } from "@testing-library/react";
import { usePaymentMethodMutations } from "../../../../../../../app/(private)/catalogs/payment-methods/_logic/hooks/usePaymentMethodMutations";

jest.mock("../../../../../../../app/(private)/catalogs/payment-methods/_logic/services/createPaymentMethod", () => ({
  createPaymentMethod: jest.fn(),
}));
jest.mock("../../../../../../../app/(private)/catalogs/payment-methods/_logic/services/updatePaymentMethod", () => ({
  updatePaymentMethod: jest.fn(),
}));
jest.mock("../../../../../../../app/(private)/catalogs/payment-methods/_logic/services/softDeletePaymentMethod", () => ({
  softDeletePaymentMethod: jest.fn(),
}));

import { createPaymentMethod } from "../../../../../../../app/(private)/catalogs/payment-methods/_logic/services/createPaymentMethod";
import { updatePaymentMethod } from "../../../../../../../app/(private)/catalogs/payment-methods/_logic/services/updatePaymentMethod";
import { softDeletePaymentMethod } from "../../../../../../../app/(private)/catalogs/payment-methods/_logic/services/softDeletePaymentMethod";

const mockCreate = createPaymentMethod as jest.Mock;
const mockUpdate = updatePaymentMethod as jest.Mock;
const mockSoftDelete = softDeletePaymentMethod as jest.Mock;

const baseEntity = {
  id: "pm-1",
  code: "CASH",
  name: "Efectivo",
  description: null,
  isActive: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-06-01"),
};

describe("usePaymentMethodMutations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("createOne éxito: retorna entity", async () => {
    mockCreate.mockResolvedValueOnce(baseEntity);

    const { result } = renderHook(() => usePaymentMethodMutations());

    let entity;
    await act(async () => {
      entity = await result.current.createOne({ code: "CASH", name: "Efectivo" });
    });

    expect(entity).toEqual(baseEntity);
    expect(result.current.mutationError).toBeNull();
  });

  it("createOne error: retorna null, mutationError no nulo", async () => {
    mockCreate.mockRejectedValueOnce(new Error("Payment method code already in use"));

    const { result } = renderHook(() => usePaymentMethodMutations());

    let entity;
    await act(async () => {
      entity = await result.current.createOne({ code: "CASH", name: "Efectivo" });
    });

    expect(entity).toBeNull();
    expect(result.current.mutationError).not.toBeNull();
  });

  it("updateOne: llama updatePaymentMethod", async () => {
    mockUpdate.mockResolvedValueOnce({ ...baseEntity, name: "Efectivo actualizado" });

    const { result } = renderHook(() => usePaymentMethodMutations());

    let entity;
    await act(async () => {
      entity = await result.current.updateOne("pm-1", { name: "Efectivo actualizado" });
    });

    expect(mockUpdate).toHaveBeenCalledWith({ id: "pm-1", body: { name: "Efectivo actualizado" } });
    expect(entity).not.toBeNull();
  });

  it("softDeleteOne: llama softDeletePaymentMethod y retorna true", async () => {
    mockSoftDelete.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => usePaymentMethodMutations());

    let success;
    await act(async () => {
      success = await result.current.softDeleteOne("pm-1");
    });

    expect(mockSoftDelete).toHaveBeenCalledWith({ id: "pm-1" });
    expect(success).toBe(true);
  });

  it("reactivateOne: llama updatePaymentMethod con { isActive: true }", async () => {
    mockUpdate.mockResolvedValueOnce({ ...baseEntity, isActive: true });

    const { result } = renderHook(() => usePaymentMethodMutations());

    await act(async () => {
      await result.current.reactivateOne("pm-1");
    });

    expect(mockUpdate).toHaveBeenCalledWith({ id: "pm-1", body: { isActive: true } });
  });
});
