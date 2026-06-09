import { listSales, getSale, cancelSale } from "../../../../../../../app/(private)/sales/_logic/services";
import { SaleNotFoundError, SaleScopingForbiddenError } from "../../../../../../../app/(private)/sales/_logic/errors";
import { NetworkError } from "../../../../../../../app/_lib/authFetch";

function mockFetch(status: number, body: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

const summaryDto = {
  id: "sale-1",
  branchId: "branch-1",
  cashierId: "user-1",
  folioId: "folio-1",
  folioNumber: 42,
  paymentMethodId: "pm-1",
  status: "completed",
  subtotal: 100,
  taxTotal: 16,
  total: 116,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe("listSales", () => {
  it("devuelve items mapeados con fechas como Date", async () => {
    const fetch = mockFetch(200, { items: [summaryDto], total: 1, page: 1, pageSize: 20 });
    const result = await listSales({}, fetch as never);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].createdAt).toBeInstanceOf(Date);
    expect(result.items[0].id).toBe("sale-1");
  });

  it("lanza SaleScopingForbiddenError en 403", async () => {
    const fetch = mockFetch(403, {});
    await expect(listSales({}, fetch as never)).rejects.toBeInstanceOf(SaleScopingForbiddenError);
  });
});

describe("getSale", () => {
  it("devuelve SaleDetail en éxito", async () => {
    const dto = { ...summaryDto, items: [], notes: null };
    const fetch = mockFetch(200, dto);
    const result = await getSale("sale-1", fetch as never);
    expect(result.id).toBe("sale-1");
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("lanza SaleNotFoundError en 404", async () => {
    const fetch = mockFetch(404, { error: "Not found" });
    await expect(getSale("x", fetch as never)).rejects.toBeInstanceOf(SaleNotFoundError);
  });
});

describe("cancelSale", () => {
  it("devuelve SaleDetail actualizado en éxito", async () => {
    const dto = { ...summaryDto, status: "cancelled", items: [], cancelledAt: new Date().toISOString() };
    const fetch = mockFetch(200, dto);
    const result = await cancelSale("sale-1", {}, fetch as never);
    expect(result.status).toBe("cancelled");
  });

  it("lanza SaleNotFoundError en 404", async () => {
    const fetch = mockFetch(404, { error: "Not found" });
    await expect(cancelSale("x", {}, fetch as never)).rejects.toBeInstanceOf(SaleNotFoundError);
  });
});
