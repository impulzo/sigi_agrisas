/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";

const pushMock = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import * as servicesModule from "../../../../../../../app/(private)/purchases/_logic/services";

jest.mock("../../../../../../../app/(private)/purchases/_logic/services");

import { useCreatePurchaseForm } from "../../../../../../../app/(private)/purchases/_logic/hooks/useCreatePurchaseForm";
import type { ProductDto } from "../../../../../../../app/(private)/purchases/_logic/types/api";

const PRODUCT: ProductDto = { id: "prod1", code: "PROD1", name: "Producto Uno", ivaRate: 0.16, iepsRate: null, isActive: true };

const isCreditByPaymentMethod = (id: string) => id === "pm-credit";

describe("useCreatePurchaseForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("empieza sin proveedor, sin líneas y canSubmit=false", () => {
    const { result } = renderHook(() => useCreatePurchaseForm("branch-1", isCreditByPaymentMethod));
    expect(result.current.providerId).toBe("");
    expect(result.current.lines).toHaveLength(0);
    expect(result.current.canSubmit).toBe(false);
  });

  it("addLine agrega una línea con cantidad 1 y costo 0 por defecto", () => {
    const { result } = renderHook(() => useCreatePurchaseForm("branch-1", isCreditByPaymentMethod));
    act(() => result.current.addLine(PRODUCT));
    expect(result.current.lines).toHaveLength(1);
    expect(result.current.lines[0].quantity).toBe(1);
    expect(result.current.lines[0].unitCost).toBe(0);
  });

  it("addLine no duplica el mismo producto dos veces", () => {
    const { result } = renderHook(() => useCreatePurchaseForm("branch-1", isCreditByPaymentMethod));
    act(() => result.current.addLine(PRODUCT));
    act(() => result.current.addLine(PRODUCT));
    expect(result.current.lines).toHaveLength(1);
  });

  it("updateQuantity/updateUnitCost recalculan totales via computePurchaseTotalsClient", () => {
    const { result } = renderHook(() => useCreatePurchaseForm("branch-1", isCreditByPaymentMethod));
    act(() => result.current.addLine(PRODUCT));
    act(() => result.current.updateQuantity(PRODUCT.id, 2));
    act(() => result.current.updateUnitCost(PRODUCT.id, 100));

    expect(result.current.totals.subtotal).toBe(200);
    expect(result.current.totals.ivaTotal).toBe(32);
    expect(result.current.totals.total).toBe(232);
  });

  it("removeLine quita la línea", () => {
    const { result } = renderHook(() => useCreatePurchaseForm("branch-1", isCreditByPaymentMethod));
    act(() => result.current.addLine(PRODUCT));
    act(() => result.current.removeLine(PRODUCT.id));
    expect(result.current.lines).toHaveLength(0);
  });

  it("isCredit refleja la forma de pago seleccionada", () => {
    const { result } = renderHook(() => useCreatePurchaseForm("branch-1", isCreditByPaymentMethod));
    expect(result.current.isCredit).toBe(false);
    act(() => result.current.setPaymentMethodId("pm-credit"));
    expect(result.current.isCredit).toBe(true);
  });

  it("canSubmit true solo con proveedor + forma de pago + líneas", () => {
    const { result } = renderHook(() => useCreatePurchaseForm("branch-1", isCreditByPaymentMethod));
    act(() => result.current.setProvider("prov1", null));
    act(() => result.current.setPaymentMethodId("pm-cash"));
    expect(result.current.canSubmit).toBe(false);
    act(() => result.current.addLine(PRODUCT));
    expect(result.current.canSubmit).toBe(true);
  });

  it("submit() llama createPurchase y redirige al detalle en éxito", async () => {
    const created = { id: "new-purchase" } as never;
    jest.spyOn(servicesModule, "createPurchase").mockResolvedValue(created);
    const { result } = renderHook(() => useCreatePurchaseForm("branch-1", isCreditByPaymentMethod));

    act(() => result.current.setProvider("prov1", null));
    act(() => result.current.setPaymentMethodId("pm-cash"));
    act(() => result.current.addLine(PRODUCT));
    act(() => result.current.updateUnitCost(PRODUCT.id, 100));

    await act(async () => { await result.current.submit(); });

    expect(servicesModule.createPurchase).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: "prov1",
        branchId: "branch-1",
        paymentMethodId: "pm-cash",
        items: [{ productId: "prod1", quantity: 1, unitCost: 100, discountPct: null }],
      })
    );
    expect(pushMock).toHaveBeenCalledWith("/purchases/new-purchase");
  });

  it("submit() setea submitError y NO redirige cuando falla", async () => {
    const err = new Error("boom");
    jest.spyOn(servicesModule, "createPurchase").mockRejectedValue(err);
    const { result } = renderHook(() => useCreatePurchaseForm("branch-1", isCreditByPaymentMethod));

    act(() => result.current.setProvider("prov1", null));
    act(() => result.current.setPaymentMethodId("pm-cash"));
    act(() => result.current.addLine(PRODUCT));

    await act(async () => { await result.current.submit(); });

    expect(pushMock).not.toHaveBeenCalled();
    expect(result.current.submitError).toBe(err);
  });
});
