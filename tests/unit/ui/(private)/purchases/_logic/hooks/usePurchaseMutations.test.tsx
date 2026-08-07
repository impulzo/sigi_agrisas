/**
 * @jest-environment jsdom
 */
import { renderHook, act } from "@testing-library/react";
import * as servicesModule from "../../../../../../../app/(private)/purchases/_logic/services";
import { PurchaseAlreadyCancelledError } from "../../../../../../../app/(private)/purchases/_logic/errors";

jest.mock("../../../../../../../app/(private)/purchases/_logic/services");

import { usePurchaseMutations } from "../../../../../../../app/(private)/purchases/_logic/hooks/usePurchaseMutations";

const NOW = new Date();

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
    status: "cancelled" as const,
    subtotal: 100,
    taxTotal: 16,
    total: 116,
    paidAmount: 116,
    paymentStatus: "paid" as const,
    notes: null,
    purchasedAt: NOW,
    satUuid: null,
    supplierInvoiceNumber: null,
    invoiceDate: null,
    xmlFileName: null,
    cancelledAt: NOW,
    cancelledBy: "u1",
    cancellationReason: "Error",
    createdAt: NOW,
    updatedAt: NOW,
    items: [],
    providerPayments: [],
    ...overrides,
  };
}

function makeProviderPayment(overrides = {}) {
  return {
    id: "pp1",
    purchaseId: "p1",
    purchaseFolioCode: "CP-000001",
    providerId: "prov1",
    providerName: "Proveedor Uno",
    branchId: "b1",
    branchName: "Matriz",
    folioId: "f2",
    folioNumber: 1,
    folioCode: "PP-000001",
    creatorId: "u1",
    creatorName: "Admin",
    amount: 50,
    status: "completed",
    notes: null,
    paidAt: NOW,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    purchase: { id: "p1", folioCode: "CP-000001", folioNumber: 1, total: 116, paidAmount: 50, paymentStatus: "partial" as const },
    ...overrides,
  };
}

describe("usePurchaseMutations — cancel", () => {
  beforeEach(() => jest.clearAllMocks());

  it("cancel() llama cancelPurchase y dispara onChange en éxito", async () => {
    const updated = makeDetail();
    jest.spyOn(servicesModule, "cancelPurchase").mockResolvedValue(updated);
    const onChange = jest.fn();
    const { result } = renderHook(() => usePurchaseMutations(onChange));

    let ret: unknown;
    await act(async () => { ret = await result.current.cancel("p1", "ya no aplica"); });

    expect(servicesModule.cancelPurchase).toHaveBeenCalledWith("p1", { reason: "ya no aplica" });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(ret).toBe(updated);
    expect(result.current.mutationError).toBeNull();
  });

  it("cancel() NO llama onChange cuando falla", async () => {
    const err = new PurchaseAlreadyCancelledError();
    jest.spyOn(servicesModule, "cancelPurchase").mockRejectedValue(err);
    const onChange = jest.fn();
    const { result } = renderHook(() => usePurchaseMutations(onChange));

    let ret: unknown;
    await act(async () => { ret = await result.current.cancel("p1"); });

    expect(onChange).not.toHaveBeenCalled();
    expect(ret).toBeNull();
    expect(result.current.mutationError).toBe(err);
  });

  it("clearError() limpia mutationError", async () => {
    jest.spyOn(servicesModule, "cancelPurchase").mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => usePurchaseMutations());
    await act(async () => { await result.current.cancel("p1"); });
    expect(result.current.mutationError).not.toBeNull();
    act(() => result.current.clearError());
    expect(result.current.mutationError).toBeNull();
  });
});

describe("usePurchaseMutations — registerPayment", () => {
  beforeEach(() => jest.clearAllMocks());

  it("registerPayment() llama registerProviderPayment y dispara onChange", async () => {
    const created = makeProviderPayment();
    jest.spyOn(servicesModule, "registerProviderPayment").mockResolvedValue(created);
    const onChange = jest.fn();
    const { result } = renderHook(() => usePurchaseMutations(onChange));

    let ret: unknown;
    await act(async () => { ret = await result.current.registerPayment("p1", 50, null); });

    expect(servicesModule.registerProviderPayment).toHaveBeenCalledWith("p1", { amount: 50, notes: null });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(ret).toBe(created);
  });
});

describe("usePurchaseMutations — cancelPayment", () => {
  beforeEach(() => jest.clearAllMocks());

  it("cancelPayment() llama cancelProviderPayment y dispara onChange", async () => {
    const cancelled = makeProviderPayment({ status: "cancelled" });
    jest.spyOn(servicesModule, "cancelProviderPayment").mockResolvedValue(cancelled);
    const onChange = jest.fn();
    const { result } = renderHook(() => usePurchaseMutations(onChange));

    let ret: unknown;
    await act(async () => { ret = await result.current.cancelPayment("pp1", null); });

    expect(servicesModule.cancelProviderPayment).toHaveBeenCalledWith("pp1", { reason: null });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(ret).toBe(cancelled);
  });
});
