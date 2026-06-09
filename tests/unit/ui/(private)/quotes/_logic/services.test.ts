/**
 * @jest-environment node
 */
import { listQuotes } from "../../../../../../app/(private)/quotes/_logic/services/listQuotes";
import { getQuote } from "../../../../../../app/(private)/quotes/_logic/services/getQuote";
import { createQuote } from "../../../../../../app/(private)/quotes/_logic/services/createQuote";
import { updateQuote } from "../../../../../../app/(private)/quotes/_logic/services/updateQuote";
import { authorizeQuote } from "../../../../../../app/(private)/quotes/_logic/services/authorizeQuote";
import { cancelQuote } from "../../../../../../app/(private)/quotes/_logic/services/cancelQuote";
import { convertQuote } from "../../../../../../app/(private)/quotes/_logic/services/convertQuote";
import {
  QuoteNotFoundError,
  QuoteScopingForbiddenError,
  QuoteExpiredError,
  QuoteNotEditableError,
  QuoteAlreadyCancelledError,
  QuoteAlreadyConvertedError,
  QuoteCreateForbiddenError,
  QuoteWriteForbiddenError,
  CustomerInactiveError,
  FolioInactiveError,
  ProductInactiveError,
  PaymentMethodInactiveError,
} from "../../../../../../app/(private)/quotes/_logic/errors";
import type { QuoteDetailDto, QuoteDto } from "../../../../../../app/(private)/quotes/_logic/types/api";

function makeRes(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

const baseDetailDto: QuoteDetailDto = {
  id: "q1",
  branchId: "b1",
  customerId: null,
  customerName: null,
  creatorId: "u1",
  creatorName: null,
  folioId: "f1",
  folioNumber: 1,
  folioPrefix: "COT",
  status: "draft",
  isExpired: false,
  subtotal: 100,
  taxTotal: 16,
  total: 116,
  expiresAt: null,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
  items: [],
};

const baseListDto: QuoteDto = {
  id: "q1",
  branchId: "b1",
  creatorId: "u1",
  folioId: "f1",
  folioNumber: 1,
  status: "draft",
  isExpired: false,
  subtotal: 100,
  taxTotal: 16,
  total: 116,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("listQuotes", () => {
  it("devuelve items mapeados en respuesta 200", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(200, { items: [baseListDto], total: 1, page: 1, pageSize: 20 }));
    const result = await listQuotes({ page: 1, pageSize: 20 }, fetch as typeof globalThis.fetch);
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].id).toBe("q1");
    expect(result.items[0].createdAt).toBeInstanceOf(Date);
  });

  it("lanza QuoteScopingForbiddenError en 403", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(403, { error: "Forbidden" }));
    await expect(listQuotes({ page: 1, pageSize: 20 }, fetch as typeof globalThis.fetch))
      .rejects.toBeInstanceOf(QuoteScopingForbiddenError);
  });

  it("incluye search en params solo si length >= 2", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(200, { items: [], total: 0, page: 1, pageSize: 20 }));
    await listQuotes({ page: 1, pageSize: 20, search: "a" }, fetch as typeof globalThis.fetch);
    const url = (fetch.mock.calls[0] as [string])[0];
    expect(url).not.toContain("search=");

    const fetch2 = jest.fn().mockResolvedValue(makeRes(200, { items: [], total: 0, page: 1, pageSize: 20 }));
    await listQuotes({ page: 1, pageSize: 20, search: "ma" }, fetch2 as typeof globalThis.fetch);
    const url2 = (fetch2.mock.calls[0] as [string])[0];
    expect(url2).toContain("search=ma");
  });
});

describe("getQuote", () => {
  it("devuelve QuoteDetail en respuesta 200", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(200, baseDetailDto));
    const result = await getQuote("q1", fetch as typeof globalThis.fetch);
    expect(result.id).toBe("q1");
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("lanza QuoteNotFoundError en 404", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(404, { error: "Not found" }));
    await expect(getQuote("q1", fetch as typeof globalThis.fetch))
      .rejects.toBeInstanceOf(QuoteNotFoundError);
  });

  it("lanza QuoteScopingForbiddenError en 403", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(403, { error: "Forbidden" }));
    await expect(getQuote("q1", fetch as typeof globalThis.fetch))
      .rejects.toBeInstanceOf(QuoteScopingForbiddenError);
  });
});

describe("createQuote", () => {
  const body = { branchId: "b1", customerId: "c1", folioId: "f1", items: [{ productId: "p1", productPriceId: "pp1", quantity: 2 }] };

  it("devuelve QuoteDetail en respuesta 201", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(201, baseDetailDto));
    const result = await createQuote(body, fetch as typeof globalThis.fetch);
    expect(result.id).toBe("q1");
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("lanza CustomerInactiveError en 400 customer inactive", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(400, { error: "Customer is inactive" }));
    await expect(createQuote(body, fetch as typeof globalThis.fetch))
      .rejects.toBeInstanceOf(CustomerInactiveError);
  });

  it("lanza FolioInactiveError en 400 folio inactive", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(400, { error: "folio is inactive" }));
    await expect(createQuote(body, fetch as typeof globalThis.fetch))
      .rejects.toBeInstanceOf(FolioInactiveError);
  });

  it("lanza ProductInactiveError en 400 product inactive", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(400, { error: "Product is inactive" }));
    await expect(createQuote(body, fetch as typeof globalThis.fetch))
      .rejects.toBeInstanceOf(ProductInactiveError);
  });

  it("lanza QuoteCreateForbiddenError en 403", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(403, { error: "Forbidden" }));
    await expect(createQuote(body, fetch as typeof globalThis.fetch))
      .rejects.toBeInstanceOf(QuoteCreateForbiddenError);
  });
});

describe("updateQuote", () => {
  const body = { notes: "Actualizada" };

  it("devuelve QuoteDetail en respuesta 200", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(200, baseDetailDto));
    const result = await updateQuote("q1", body, fetch as typeof globalThis.fetch);
    expect(result.id).toBe("q1");
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("lanza QuoteNotEditableError en 409 con status en el body", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(409, { status: "authorized" }));
    const err = await updateQuote("q1", body, fetch as typeof globalThis.fetch).catch((e) => e);
    expect(err).toBeInstanceOf(QuoteNotEditableError);
    expect((err as QuoteNotEditableError).status).toBe("authorized");
  });

  it("lanza QuoteWriteForbiddenError en 403", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(403, { error: "Forbidden" }));
    await expect(updateQuote("q1", body, fetch as typeof globalThis.fetch))
      .rejects.toBeInstanceOf(QuoteWriteForbiddenError);
  });
});

describe("authorizeQuote", () => {
  it("devuelve QuoteDetail en respuesta 200", async () => {
    const authorized = { ...baseDetailDto, status: "authorized" as const };
    const fetch = jest.fn().mockResolvedValue(makeRes(200, authorized));
    const result = await authorizeQuote("q1", {}, fetch as typeof globalThis.fetch);
    expect(result.status).toBe("authorized");
  });

  it("lanza QuoteExpiredError cuando 409 con 'expir' en el mensaje", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(409, { error: "Quote has expired" }));
    await expect(authorizeQuote("q1", {}, fetch as typeof globalThis.fetch))
      .rejects.toBeInstanceOf(QuoteExpiredError);
  });

  it("lanza QuoteNotEditableError cuando 409 con status en el body", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(409, { status: "cancelled" }));
    const err = await authorizeQuote("q1", {}, fetch as typeof globalThis.fetch).catch((e) => e);
    expect(err).toBeInstanceOf(QuoteNotEditableError);
    expect((err as QuoteNotEditableError).status).toBe("cancelled");
  });
});

describe("cancelQuote", () => {
  it("devuelve QuoteDetail en respuesta 200", async () => {
    const cancelled = { ...baseDetailDto, status: "cancelled" as const };
    const fetch = jest.fn().mockResolvedValue(makeRes(200, cancelled));
    const result = await cancelQuote("q1", {}, fetch as typeof globalThis.fetch);
    expect(result.status).toBe("cancelled");
  });

  it("lanza QuoteAlreadyConvertedError cuando 409 con saleId", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(409, { error: "already converted", saleId: "s1" }));
    const err = await cancelQuote("q1", {}, fetch as typeof globalThis.fetch).catch((e) => e);
    expect(err).toBeInstanceOf(QuoteAlreadyConvertedError);
    expect((err as QuoteAlreadyConvertedError).saleId).toBe("s1");
  });

  it("lanza QuoteAlreadyCancelledError cuando 409 sin saleId", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(409, { error: "already cancelled" }));
    await expect(cancelQuote("q1", {}, fetch as typeof globalThis.fetch))
      .rejects.toBeInstanceOf(QuoteAlreadyCancelledError);
  });
});

describe("convertQuote", () => {
  const saleDto = {
    id: "s1",
    branchId: "b1",
    branchName: "Main",
    cashierId: "u1",
    cashierName: null,
    customerId: null,
    customerName: null,
    folioId: "f1",
    folioNumber: 1,
    folioPrefix: "A",
    paymentMethodId: "pm1",
    paymentMethodName: "Efectivo",
    status: "completed",
    subtotal: 100,
    taxTotal: 16,
    total: 116,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    items: [],
  };

  it("devuelve SaleDetail en respuesta 200", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(200, saleDto));
    const result = await convertQuote("q1", { folioId: "f2", paymentMethodId: "pm1" }, fetch as typeof globalThis.fetch);
    expect(result.id).toBe("s1");
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("lanza QuoteExpiredError cuando 409 con 'expir'", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(409, { error: "Quote has expired" }));
    await expect(convertQuote("q1", { folioId: "f2", paymentMethodId: "pm1" }, fetch as typeof globalThis.fetch))
      .rejects.toBeInstanceOf(QuoteExpiredError);
  });

  it("lanza FolioInactiveError cuando 400 con 'folio' e 'inactive'", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(400, { error: "folio is inactive" }));
    await expect(convertQuote("q1", { folioId: "f2", paymentMethodId: "pm1" }, fetch as typeof globalThis.fetch))
      .rejects.toBeInstanceOf(FolioInactiveError);
  });

  it("lanza PaymentMethodInactiveError cuando 400 con 'payment' e 'inactive'", async () => {
    const fetch = jest.fn().mockResolvedValue(makeRes(400, { error: "payment method is inactive" }));
    await expect(convertQuote("q1", { folioId: "f2", paymentMethodId: "pm1" }, fetch as typeof globalThis.fetch))
      .rejects.toBeInstanceOf(PaymentMethodInactiveError);
  });
});
