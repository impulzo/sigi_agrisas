import {
  listReturns,
  getReturn,
  listSaleReturns,
  createReturn,
  cancelReturn,
} from "../../../../../../../app/(private)/returns/_logic/services";
import {
  ReturnNotFoundError,
  ReturnAlreadyCancelledError,
  SaleNotReturnableError,
  ReturnItemsEmptyError,
  SaleItemNotPartOfSaleError,
  ReturnQuantityExceedsRemainingError,
  SaleNotFoundError,
  ReturnReadForbiddenError,
  ReturnCreateForbiddenError,
  ReturnCancelForbiddenError,
  ReturnScopingForbiddenError,
} from "../../../../../../../app/(private)/returns/_logic/errors";
import { NetworkError } from "../../../../../../../app/_lib/authFetch";

const NOW = new Date().toISOString();

const returnDto = {
  id: "r1",
  saleId: "s1",
  branchId: "b1",
  creatorId: "u1",
  status: "completed" as const,
  reason: "Producto en mal estado",
  refundTotal: 50,
  returnedAt: NOW,
  createdAt: NOW,
  updatedAt: NOW,
};

const returnDetailDto = {
  ...returnDto,
  items: [],
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

// ── listReturns ──────────────────────────────────────────────────────────────

describe("listReturns", () => {
  it("happy path — devuelve items con returnedAt como Date", async () => {
    const fetch = mockFetch(200, { items: [returnDto], total: 1, page: 1, pageSize: 20 });
    const result = await listReturns({}, fetch as never);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].returnedAt).toBeInstanceOf(Date);
    expect(result.items[0].id).toBe("r1");
  });

  it("lanza ReturnReadForbiddenError en ForbiddenError sin branches:access_all", async () => {
    const { ForbiddenError } = await import("../../../../../../../app/_lib/authFetch");
    const fetch = mockFetchThrow(new ForbiddenError("returns:read"));
    await expect(listReturns({}, fetch as never)).rejects.toBeInstanceOf(ReturnReadForbiddenError);
  });

  it("lanza ReturnScopingForbiddenError en ForbiddenError con branches:access_all", async () => {
    const { ForbiddenError } = await import("../../../../../../../app/_lib/authFetch");
    const fetch = mockFetchThrow(new ForbiddenError("branches:access_all"));
    await expect(listReturns({}, fetch as never)).rejects.toBeInstanceOf(ReturnScopingForbiddenError);
  });

  it("propaga AbortError sin transformar", async () => {
    const err = new Error("abort");
    err.name = "AbortError";
    const fetch = mockFetchThrow(err);
    await expect(listReturns({}, fetch as never)).rejects.toMatchObject({ name: "AbortError" });
  });
});

// ── getReturn ────────────────────────────────────────────────────────────────

describe("getReturn", () => {
  it("happy path — devuelve ReturnDetail con fechas como Date", async () => {
    const fetch = mockFetch(200, returnDetailDto);
    const result = await getReturn("r1", fetch as never);
    expect(result.id).toBe("r1");
    expect(result.returnedAt).toBeInstanceOf(Date);
    expect(result.items).toEqual([]);
  });

  it("lanza ReturnNotFoundError en 404", async () => {
    const fetch = mockFetch(404, { error: "Not found" });
    await expect(getReturn("x", fetch as never)).rejects.toBeInstanceOf(ReturnNotFoundError);
  });

  it("lanza ReturnScopingForbiddenError en ForbiddenError con branches:access_all", async () => {
    const { ForbiddenError } = await import("../../../../../../../app/_lib/authFetch");
    const fetch = mockFetchThrow(new ForbiddenError("branches:access_all"));
    await expect(getReturn("r1", fetch as never)).rejects.toBeInstanceOf(ReturnScopingForbiddenError);
  });
});

// ── listSaleReturns ──────────────────────────────────────────────────────────

describe("listSaleReturns", () => {
  it("happy path — desempaqueta body.returns", async () => {
    const fetch = mockFetch(200, { returns: [returnDto] });
    const result = await listSaleReturns("s1", fetch as never);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("r1");
  });

  it("devuelve array vacío cuando returns es vacío", async () => {
    const fetch = mockFetch(200, { returns: [] });
    const result = await listSaleReturns("s1", fetch as never);
    expect(result).toEqual([]);
  });

  it("lanza SaleNotFoundError en 404", async () => {
    const fetch = mockFetch(404, { error: "Not found" });
    await expect(listSaleReturns("x", fetch as never)).rejects.toBeInstanceOf(SaleNotFoundError);
  });
});

// ── createReturn ─────────────────────────────────────────────────────────────

describe("createReturn", () => {
  const body = {
    saleId: "s1",
    reason: "Defecto",
    returnedAt: NOW,
    items: [{ saleItemId: "si1", quantity: 1 }],
  };

  it("happy path — 201 devuelve ReturnDetail", async () => {
    const fetch = mockFetch(201, returnDetailDto);
    const result = await createReturn(body, fetch as never);
    expect(result.id).toBe("r1");
  });

  it("lanza ReturnItemsEmptyError en 400 'Return must include at least one item'", async () => {
    const fetch = mockFetch(400, { error: "Return must include at least one item" });
    await expect(createReturn(body, fetch as never)).rejects.toBeInstanceOf(ReturnItemsEmptyError);
  });

  it("lanza SaleNotFoundError en 400 'Sale not found'", async () => {
    const fetch = mockFetch(400, { error: "Sale not found" });
    await expect(createReturn(body, fetch as never)).rejects.toBeInstanceOf(SaleNotFoundError);
  });

  it("lanza SaleItemNotPartOfSaleError en 400 con saleItemId", async () => {
    const fetch = mockFetch(400, { error: "Item not part of sale", saleItemId: "si1" });
    const err = await createReturn(body, fetch as never).catch((e) => e);
    expect(err).toBeInstanceOf(SaleItemNotPartOfSaleError);
    expect((err as SaleItemNotPartOfSaleError).saleItemId).toBe("si1");
  });

  it("lanza SaleNotReturnableError en 409 con status", async () => {
    const fetch = mockFetch(409, { error: "Sale is not returnable", status: "cancelled" });
    const err = await createReturn(body, fetch as never).catch((e) => e);
    expect(err).toBeInstanceOf(SaleNotReturnableError);
    expect((err as SaleNotReturnableError).saleStatus).toBe("cancelled");
  });

  it("lanza ReturnQuantityExceedsRemainingError en 409 con saleItemId/requested/remaining", async () => {
    const fetch = mockFetch(409, { error: "Exceeds", saleItemId: "si1", requested: 5, remaining: 3 });
    const err = await createReturn(body, fetch as never).catch((e) => e);
    expect(err).toBeInstanceOf(ReturnQuantityExceedsRemainingError);
    expect((err as ReturnQuantityExceedsRemainingError).saleItemId).toBe("si1");
    expect((err as ReturnQuantityExceedsRemainingError).requested).toBe(5);
    expect((err as ReturnQuantityExceedsRemainingError).remaining).toBe(3);
  });

  it("lanza ReturnCreateForbiddenError en ForbiddenError sin bypass", async () => {
    const { ForbiddenError } = await import("../../../../../../../app/_lib/authFetch");
    const fetch = mockFetchThrow(new ForbiddenError("returns:create"));
    await expect(createReturn(body, fetch as never)).rejects.toBeInstanceOf(ReturnCreateForbiddenError);
  });

  it("lanza ReturnScopingForbiddenError en ForbiddenError con branches:access_all", async () => {
    const { ForbiddenError } = await import("../../../../../../../app/_lib/authFetch");
    const fetch = mockFetchThrow(new ForbiddenError("branches:access_all"));
    await expect(createReturn(body, fetch as never)).rejects.toBeInstanceOf(ReturnScopingForbiddenError);
  });
});

// ── cancelReturn ─────────────────────────────────────────────────────────────

describe("cancelReturn", () => {
  it("happy path — devuelve ReturnDetail con status cancelled", async () => {
    const dto = { ...returnDetailDto, status: "cancelled", cancelledAt: NOW };
    const fetch = mockFetch(200, dto);
    const result = await cancelReturn("r1", {}, fetch as never);
    expect(result.status).toBe("cancelled");
  });

  it("lanza ReturnNotFoundError en 404", async () => {
    const fetch = mockFetch(404, { error: "Not found" });
    await expect(cancelReturn("x", {}, fetch as never)).rejects.toBeInstanceOf(ReturnNotFoundError);
  });

  it("lanza ReturnAlreadyCancelledError en 409", async () => {
    const fetch = mockFetch(409, { error: "Return is already cancelled" });
    await expect(cancelReturn("r1", {}, fetch as never)).rejects.toBeInstanceOf(ReturnAlreadyCancelledError);
  });

  it("lanza ReturnCancelForbiddenError en ForbiddenError sin bypass", async () => {
    const { ForbiddenError } = await import("../../../../../../../app/_lib/authFetch");
    const fetch = mockFetchThrow(new ForbiddenError("returns:cancel"));
    await expect(cancelReturn("r1", {}, fetch as never)).rejects.toBeInstanceOf(ReturnCancelForbiddenError);
  });

  it("lanza NetworkError en error genérico", async () => {
    const fetch = mockFetch(500, {});
    await expect(cancelReturn("r1", {}, fetch as never)).rejects.toBeInstanceOf(NetworkError);
  });
});
