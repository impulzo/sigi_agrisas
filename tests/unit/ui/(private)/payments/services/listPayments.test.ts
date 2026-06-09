/**
 * @jest-environment node
 */
import { listPayments } from "../../../../../../app/(private)/payments/_logic/services/listPayments";

function mockFetch(body: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

const PAYMENT_DTO = {
  id: "p1",
  saleId: "s1",
  saleFolioCode: "A-1",
  customerId: "c1",
  customerName: "Cliente",
  userId: "u1",
  userName: "Cobrador",
  branchId: "b1",
  branchName: "Central",
  paymentMethodId: "pm1",
  paymentMethodName: "Efectivo",
  folioId: "f1",
  folioCode: "RECIBO",
  folioNumber: 1,
  folioPrefix: "RECIBO-",
  amount: "100.00",
  status: "completed" as const,
  notes: null,
  createdAt: "2026-06-01T10:00:00Z",
  updatedAt: "2026-06-01T10:00:00Z",
};

describe("listPayments", () => {
  it("returns mapped payments", async () => {
    const fetch = mockFetch({ items: [PAYMENT_DTO], total: 1, page: 1, pageSize: 20 });
    const result = await listPayments({}, fetch);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].amount).toBe(100);
    expect(result.items[0].createdAt).toBeInstanceOf(Date);
  });

  it("passes filters as query params", async () => {
    const fetchFn = mockFetch({ items: [], total: 0, page: 1, pageSize: 20 });
    await listPayments({ status: "completed", branchId: "b1", search: "test" }, fetchFn);
    const url = (fetchFn as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain("status=completed");
    expect(url).toContain("branchId=b1");
    expect(url).toContain("search=test");
  });

  it("does not include empty search in query", async () => {
    const fetchFn = mockFetch({ items: [], total: 0, page: 1, pageSize: 20 });
    await listPayments({ search: "" }, fetchFn);
    const url = (fetchFn as jest.Mock).mock.calls[0][0] as string;
    expect(url).not.toContain("search=");
  });
});
