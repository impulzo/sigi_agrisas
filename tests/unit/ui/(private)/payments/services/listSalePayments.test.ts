/**
 * @jest-environment node
 */
import { listSalePayments } from "../../../../../../app/(private)/payments/_logic/services/listSalePayments";

function mockFetch(body: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

describe("listSalePayments", () => {
  it("returns aggregated sale payments data", async () => {
    const fetch = mockFetch({
      items: [],
      paidAmount: "300.00",
      total: "1000.00",
      paymentStatus: "partial",
    });
    const result = await listSalePayments("s1", fetch);
    expect(result.paidAmount).toBe(300);
    expect(result.total).toBe(1000);
    expect(result.paymentStatus).toBe("partial");
  });

  it("calls correct endpoint", async () => {
    const fetchFn = mockFetch({ items: [], paidAmount: "0", total: "100", paymentStatus: "pending" });
    await listSalePayments("sale-abc", fetchFn);
    const url = (fetchFn as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain("/api/v1/admin/sales/sale-abc/payments");
  });
});
