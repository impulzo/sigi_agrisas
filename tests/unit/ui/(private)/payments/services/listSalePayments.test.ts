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
      saleId: "s1",
      salePaidAmount: "300.00",
      saleTotal: "1000.00",
      salePaymentStatus: "partial",
      saleDueAmount: "700.00",
      lineBalances: [],
    });
    const result = await listSalePayments("s1", fetch);
    expect(result.paidAmount).toBe(300);
    expect(result.total).toBe(1000);
    expect(result.paymentStatus).toBe("partial");
    expect(result.lineBalances).toEqual([]);
  });

  it("maps lineBalances from the response", async () => {
    const fetch = mockFetch({
      items: [],
      saleId: "s1",
      salePaidAmount: "60.00",
      saleTotal: "150.00",
      salePaymentStatus: "partial",
      saleDueAmount: "90.00",
      lineBalances: [
        { saleItemId: "li-1", productNameSnapshot: "Producto A", lineTotal: "100.00", paidAmount: "60.00", dueAmount: "40.00" },
        { saleItemId: "li-2", productNameSnapshot: "Producto B", lineTotal: "50.00", paidAmount: "0.00", dueAmount: "50.00" },
      ],
    });
    const result = await listSalePayments("s1", fetch);
    expect(result.lineBalances).toEqual([
      { saleItemId: "li-1", productNameSnapshot: "Producto A", lineTotal: 100, paidAmount: 60, dueAmount: 40 },
      { saleItemId: "li-2", productNameSnapshot: "Producto B", lineTotal: 50, paidAmount: 0, dueAmount: 50 },
    ]);
  });

  it("calls correct endpoint", async () => {
    const fetchFn = mockFetch({
      items: [],
      saleId: "sale-abc",
      salePaidAmount: "0",
      saleTotal: "100",
      salePaymentStatus: "pending",
      saleDueAmount: "100",
      lineBalances: [],
    });
    await listSalePayments("sale-abc", fetchFn);
    const url = (fetchFn as jest.Mock).mock.calls[0][0] as string;
    expect(url).toContain("/api/v1/admin/sales/sale-abc/payments");
  });
});
