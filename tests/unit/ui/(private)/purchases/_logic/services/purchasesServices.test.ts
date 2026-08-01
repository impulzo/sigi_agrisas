import {
  listPurchases,
  getPurchase,
  createPurchase,
  cancelPurchase,
  registerProviderPayment,
  cancelProviderPayment,
} from "../../../../../../../app/(private)/purchases/_logic/services";
import {
  PurchaseNotFoundError,
  PurchaseAlreadyCancelledError,
  PurchaseHasActiveProviderPaymentsError,
  PurchaseItemsEmptyError,
  ProviderNotFoundOrInactiveError,
  ProductNotFoundOrInactiveError,
  PurchaseNotPayableError,
  ProviderPaymentExceedsDueAmountError,
  ProviderPaymentNotFoundError,
  ProviderPaymentAlreadyCancelledError,
  PurchaseReadForbiddenError,
  PurchaseCreateForbiddenError,
  PurchaseCancelForbiddenError,
  PurchasePayForbiddenError,
  PurchasePayCancelForbiddenError,
  PurchaseScopingForbiddenError,
} from "../../../../../../../app/(private)/purchases/_logic/errors";
import { NetworkError } from "../../../../../../../app/_lib/authFetch";

const NOW = new Date().toISOString();

const purchaseDto = {
  id: "p1",
  providerId: "prov1",
  providerName: "Proveedor Uno",
  providerRfc: "PRO010101AAA",
  branchId: "b1",
  branchName: "Matriz",
  paymentMethodId: "pm1",
  paymentMethodCode: "CREDITO",
  paymentMethodIsCredit: true,
  creatorId: "u1",
  creatorName: "Admin",
  folioId: "f1",
  folioNumber: 1,
  folioCode: "CP-000001",
  status: "completed" as const,
  subtotal: "100.0000",
  taxTotal: "16.0000",
  total: "116.0000",
  paidAmount: "0.0000",
  paymentStatus: "pending" as const,
  notes: null,
  purchasedAt: NOW,
  cancelledAt: null,
  cancelledBy: null,
  cancellationReason: null,
  createdAt: NOW,
  updatedAt: NOW,
};

const purchaseDetailDto = {
  ...purchaseDto,
  items: [],
  providerPayments: [],
};

const providerPaymentDto = {
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
  amount: "50.0000",
  status: "completed",
  notes: null,
  paidAt: NOW,
  cancelledAt: null,
  cancelledBy: null,
  cancellationReason: null,
  purchase: {
    id: "p1",
    folioCode: "CP-000001",
    folioNumber: 1,
    total: "116.0000",
    paidAmount: "50.0000",
    paymentStatus: "partial",
  },
};

function mockFetch(status: number, body: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

function mockFetchThrow(err: Error) {
  return jest.fn().mockRejectedValue(err);
}

describe("listPurchases", () => {
  it("happy path — devuelve items con montos parseados a number", async () => {
    const fetch = mockFetch(200, { items: [purchaseDto], total: 1, page: 1, pageSize: 20 });
    const result = await listPurchases({}, fetch as never);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].total).toBe(116);
    expect(result.items[0].purchasedAt).toBeInstanceOf(Date);
  });

  it("lanza PurchaseReadForbiddenError sin bypass", async () => {
    const { ForbiddenError } = await import("../../../../../../../app/_lib/authFetch");
    const fetch = mockFetchThrow(new ForbiddenError("purchases:read"));
    await expect(listPurchases({}, fetch as never)).rejects.toBeInstanceOf(PurchaseReadForbiddenError);
  });

  it("lanza PurchaseScopingForbiddenError con branches:access_all", async () => {
    const { ForbiddenError } = await import("../../../../../../../app/_lib/authFetch");
    const fetch = mockFetchThrow(new ForbiddenError("branches:access_all"));
    await expect(listPurchases({}, fetch as never)).rejects.toBeInstanceOf(PurchaseScopingForbiddenError);
  });
});

describe("getPurchase", () => {
  it("happy path — parsea montos y fechas", async () => {
    const fetch = mockFetch(200, purchaseDetailDto);
    const result = await getPurchase("p1", fetch as never);
    expect(result.id).toBe("p1");
    expect(result.total).toBe(116);
    expect(result.paidAmount).toBe(0);
  });

  it("lanza PurchaseNotFoundError en 404", async () => {
    const fetch = mockFetch(404, { error: "Not found" });
    await expect(getPurchase("x", fetch as never)).rejects.toBeInstanceOf(PurchaseNotFoundError);
  });
});

describe("createPurchase", () => {
  const body = {
    providerId: "prov1",
    branchId: "b1",
    paymentMethodId: "pm1",
    items: [{ productId: "prod1", quantity: 1, unitCost: 100 }],
  };

  it("happy path — 201 devuelve PurchaseDetail", async () => {
    const fetch = mockFetch(201, purchaseDetailDto);
    const result = await createPurchase(body, fetch as never);
    expect(result.id).toBe("p1");
  });

  it("lanza ProviderNotFoundOrInactiveError en 400", async () => {
    const fetch = mockFetch(400, { error: "Provider not found or inactive" });
    await expect(createPurchase(body, fetch as never)).rejects.toBeInstanceOf(ProviderNotFoundOrInactiveError);
  });

  it("lanza ProductNotFoundOrInactiveError en 400", async () => {
    const fetch = mockFetch(400, { error: "Product not found or inactive" });
    await expect(createPurchase(body, fetch as never)).rejects.toBeInstanceOf(ProductNotFoundOrInactiveError);
  });

  it("lanza PurchaseItemsEmptyError en 400", async () => {
    const fetch = mockFetch(400, { error: "Purchase must include at least one item" });
    await expect(createPurchase(body, fetch as never)).rejects.toBeInstanceOf(PurchaseItemsEmptyError);
  });

  it("lanza PurchaseCreateForbiddenError sin bypass", async () => {
    const { ForbiddenError } = await import("../../../../../../../app/_lib/authFetch");
    const fetch = mockFetchThrow(new ForbiddenError("purchases:create"));
    await expect(createPurchase(body, fetch as never)).rejects.toBeInstanceOf(PurchaseCreateForbiddenError);
  });
});

describe("cancelPurchase", () => {
  it("happy path — devuelve PurchaseDetail cancelado", async () => {
    const fetch = mockFetch(200, { ...purchaseDetailDto, status: "cancelled" });
    const result = await cancelPurchase("p1", {}, fetch as never);
    expect(result.status).toBe("cancelled");
  });

  it("lanza PurchaseNotFoundError en 404", async () => {
    const fetch = mockFetch(404, { error: "Not found" });
    await expect(cancelPurchase("x", {}, fetch as never)).rejects.toBeInstanceOf(PurchaseNotFoundError);
  });

  it("lanza PurchaseHasActiveProviderPaymentsError en 409 con providerPaymentIds", async () => {
    const fetch = mockFetch(409, { error: "has active payments", providerPaymentIds: ["pp1"] });
    const err = await cancelPurchase("p1", {}, fetch as never).catch((e) => e);
    expect(err).toBeInstanceOf(PurchaseHasActiveProviderPaymentsError);
    expect((err as PurchaseHasActiveProviderPaymentsError).providerPaymentIds).toEqual(["pp1"]);
  });

  it("lanza PurchaseAlreadyCancelledError en 409 sin providerPaymentIds", async () => {
    const fetch = mockFetch(409, { error: "already cancelled" });
    await expect(cancelPurchase("p1", {}, fetch as never)).rejects.toBeInstanceOf(PurchaseAlreadyCancelledError);
  });

  it("lanza PurchaseCancelForbiddenError sin bypass", async () => {
    const { ForbiddenError } = await import("../../../../../../../app/_lib/authFetch");
    const fetch = mockFetchThrow(new ForbiddenError("purchases:cancel"));
    await expect(cancelPurchase("p1", {}, fetch as never)).rejects.toBeInstanceOf(PurchaseCancelForbiddenError);
  });
});

describe("registerProviderPayment", () => {
  it("happy path — devuelve ProviderPayment", async () => {
    const fetch = mockFetch(201, providerPaymentDto);
    const result = await registerProviderPayment("p1", { amount: 50 }, fetch as never);
    expect(result.amount).toBe(50);
    expect(result.purchase.paidAmount).toBe(50);
  });

  it("lanza PurchaseNotFoundError en 404", async () => {
    const fetch = mockFetch(404, { error: "Not found" });
    await expect(registerProviderPayment("x", { amount: 10 }, fetch as never)).rejects.toBeInstanceOf(PurchaseNotFoundError);
  });

  it("lanza ProviderPaymentExceedsDueAmountError en 409 con due", async () => {
    const fetch = mockFetch(409, { error: "exceeds due", due: "30.0000" });
    const err = await registerProviderPayment("p1", { amount: 100 }, fetch as never).catch((e) => e);
    expect(err).toBeInstanceOf(ProviderPaymentExceedsDueAmountError);
    expect((err as ProviderPaymentExceedsDueAmountError).due).toBe(30);
  });

  it("lanza PurchaseNotPayableError en 409 sin due", async () => {
    const fetch = mockFetch(409, { error: "not credit" });
    await expect(registerProviderPayment("p1", { amount: 10 }, fetch as never)).rejects.toBeInstanceOf(PurchaseNotPayableError);
  });

  it("lanza PurchasePayForbiddenError sin bypass", async () => {
    const { ForbiddenError } = await import("../../../../../../../app/_lib/authFetch");
    const fetch = mockFetchThrow(new ForbiddenError("purchases:pay"));
    await expect(registerProviderPayment("p1", { amount: 10 }, fetch as never)).rejects.toBeInstanceOf(PurchasePayForbiddenError);
  });
});

describe("cancelProviderPayment", () => {
  it("happy path — devuelve ProviderPayment cancelado", async () => {
    const fetch = mockFetch(200, { ...providerPaymentDto, status: "cancelled" });
    const result = await cancelProviderPayment("pp1", {}, fetch as never);
    expect(result.status).toBe("cancelled");
  });

  it("lanza ProviderPaymentNotFoundError en 404", async () => {
    const fetch = mockFetch(404, { error: "Not found" });
    await expect(cancelProviderPayment("x", {}, fetch as never)).rejects.toBeInstanceOf(ProviderPaymentNotFoundError);
  });

  it("lanza ProviderPaymentAlreadyCancelledError en 409", async () => {
    const fetch = mockFetch(409, { error: "already cancelled" });
    await expect(cancelProviderPayment("pp1", {}, fetch as never)).rejects.toBeInstanceOf(ProviderPaymentAlreadyCancelledError);
  });

  it("lanza PurchasePayCancelForbiddenError sin bypass", async () => {
    const { ForbiddenError } = await import("../../../../../../../app/_lib/authFetch");
    const fetch = mockFetchThrow(new ForbiddenError("purchases:pay_cancel"));
    await expect(cancelProviderPayment("pp1", {}, fetch as never)).rejects.toBeInstanceOf(PurchasePayCancelForbiddenError);
  });

  it("lanza NetworkError en error genérico", async () => {
    const fetch = mockFetch(500, {});
    await expect(cancelProviderPayment("pp1", {}, fetch as never)).rejects.toBeInstanceOf(NetworkError);
  });
});
