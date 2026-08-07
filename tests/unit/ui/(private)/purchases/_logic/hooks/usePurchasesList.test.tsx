/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from "@testing-library/react";
import * as servicesModule from "../../../../../../../app/(private)/purchases/_logic/services";

jest.mock("../../../../../../../app/(private)/purchases/_logic/services");

import { usePurchasesList } from "../../../../../../../app/(private)/purchases/_logic/hooks/usePurchasesList";

function makeResult(overrides = {}) {
  return {
    items: [
      {
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
        satUuid: null,
        supplierInvoiceNumber: null,
        invoiceDate: null,
        xmlFileName: null,
        cancelledAt: null,
        cancelledBy: null,
        cancellationReason: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
    ...overrides,
  };
}

const baseFilters = { page: 1, pageSize: 20, status: [] as string[] };

describe("usePurchasesList", () => {
  beforeEach(() => jest.clearAllMocks());

  it("llama listPurchases al montar y actualiza state", async () => {
    jest.spyOn(servicesModule, "listPurchases").mockResolvedValue(makeResult());
    const { result } = renderHook(() => usePurchasesList(baseFilters as never));

    expect(result.current.isLoading).toBe(true);
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(servicesModule.listPurchases).toHaveBeenCalledTimes(1);
    expect(result.current.items).toHaveLength(1);
    expect(result.current.total).toBe(1);
  });

  it("refresh() vuelve a invocar el servicio", async () => {
    const spy = jest.spyOn(servicesModule, "listPurchases").mockResolvedValue(makeResult());
    const { result } = renderHook(() => usePurchasesList(baseFilters as never));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    const callsBefore = spy.mock.calls.length;

    act(() => result.current.refresh());
    await waitFor(() => expect(spy.mock.calls.length).toBeGreaterThan(callsBefore));
  });

  it("error de fetch → setea error y deja de cargar", async () => {
    const err = new Error("Network failure");
    jest.spyOn(servicesModule, "listPurchases").mockRejectedValue(err);
    const { result } = renderHook(() => usePurchasesList(baseFilters as never));

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.error).toBe(err);
  });

  it("pasa providerId al servicio cuando se define", async () => {
    jest.spyOn(servicesModule, "listPurchases").mockResolvedValue(makeResult());
    renderHook(() => usePurchasesList({ ...baseFilters, providerId: "prov1" } as never));

    await waitFor(() =>
      expect(servicesModule.listPurchases).toHaveBeenCalledWith(
        expect.objectContaining({ providerId: "prov1" })
      )
    );
  });
});
