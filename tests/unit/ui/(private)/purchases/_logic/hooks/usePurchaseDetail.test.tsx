/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import * as servicesModule from "../../../../../../../app/(private)/purchases/_logic/services";
import { PurchaseNotFoundError } from "../../../../../../../app/(private)/purchases/_logic/errors";

jest.mock("../../../../../../../app/(private)/purchases/_logic/services");

import { usePurchaseDetail } from "../../../../../../../app/(private)/purchases/_logic/hooks/usePurchaseDetail";

function makeDetail(overrides = {}) {
  return {
    id: "p1",
    providerId: "prov1",
    providerName: "Proveedor Uno",
    providerRfc: null,
    branchId: "b1",
    branchName: "Matriz",
    paymentMethodId: "pm1",
    paymentMethodCode: "EFECTIVO",
    paymentMethodIsCredit: false,
    creatorId: "u1",
    creatorName: "Admin",
    folioId: "f1",
    folioNumber: 1,
    folioCode: "CP-000001",
    status: "completed" as const,
    subtotal: 100,
    taxTotal: 16,
    total: 116,
    paidAmount: 116,
    paymentStatus: "paid" as const,
    notes: null,
    purchasedAt: new Date(),
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [],
    providerPayments: [],
    ...overrides,
  };
}

describe("usePurchaseDetail", () => {
  beforeEach(() => jest.clearAllMocks());

  it("llama getPurchase al montar y actualiza state", async () => {
    const detail = makeDetail();
    jest.spyOn(servicesModule, "getPurchase").mockResolvedValue(detail);
    const { result } = renderHook(() => usePurchaseDetail("p1"));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(servicesModule.getPurchase).toHaveBeenCalledWith("p1");
    expect(result.current.purchaseDetail).toBe(detail);
  });

  it("error de fetch → setea error", async () => {
    const err = new PurchaseNotFoundError();
    jest.spyOn(servicesModule, "getPurchase").mockRejectedValue(err);
    const { result } = renderHook(() => usePurchaseDetail("nope"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe(err);
    expect(result.current.purchaseDetail).toBeNull();
  });

  it("refresh() vuelve a invocar el servicio", async () => {
    const spy = jest.spyOn(servicesModule, "getPurchase").mockResolvedValue(makeDetail());
    const { result } = renderHook(() => usePurchaseDetail("p1"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const callsBefore = spy.mock.calls.length;

    act(() => result.current.refresh());
    await waitFor(() => expect(spy.mock.calls.length).toBeGreaterThan(callsBefore));
  });
});
