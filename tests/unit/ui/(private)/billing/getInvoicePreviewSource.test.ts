/**
 * @jest-environment jsdom
 */
import { getInvoicePreviewSource } from "../../../../../app/(private)/billing/_logic/services/getInvoicePreviewSource";
import { ForbiddenError } from "../../../../../app/_lib/authFetch";

function jsonRes(status: number, body: unknown, ok = status >= 200 && status < 300): Response {
  return {
    ok,
    status,
    json: () => Promise.resolve(body),
  } as unknown as Response;
}

describe("getInvoicePreviewSource", () => {
  it("happy path: resolves sale items and customer fiscal data", async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(jsonRes(200, {
        branchName: "Matriz",
        customerId: "cust-1",
        items: [
          { productNameSnapshot: "Fertilizante", productCodeSnapshot: "SKU1", quantity: 2, unitPrice: 100, discountPct: 0, ivaRate: 0.16, iepsRate: 0 },
        ],
      }))
      .mockResolvedValueOnce(jsonRes(200, {
        rfc: "XAXX010101000", name: "Cliente", cfdiUse: "G03", taxRegime: "601", taxZipCode: "45010",
      }));

    const result = await getInvoicePreviewSource("sale-1", fetchImpl as unknown as typeof fetch);

    expect(fetchImpl).toHaveBeenNthCalledWith(1, "/api/v1/admin/sales/sale-1");
    expect(fetchImpl).toHaveBeenNthCalledWith(2, "/api/v1/admin/customers/cust-1");
    expect(result.sale.branchName).toBe("Matriz");
    expect(result.sale.items).toHaveLength(1);
    expect(result.customer.rfc).toBe("XAXX010101000");
  });

  it("sale without customerId throws a clear error and does not call the customer endpoint", async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(jsonRes(200, {
      branchName: "Matriz", customerId: null, items: [],
    }));

    await expect(getInvoicePreviewSource("sale-1", fetchImpl as unknown as typeof fetch))
      .rejects.toThrow("Esta venta no tiene cliente asociado, no se puede facturar");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("404 on sale throws a clear error", async () => {
    const fetchImpl = jest.fn().mockResolvedValueOnce(jsonRes(404, { error: "SaleNotFound" }));

    await expect(getInvoicePreviewSource("missing", fetchImpl as unknown as typeof fetch))
      .rejects.toThrow("Venta no encontrada");
  });

  it("403 on customer lookup throws a clear permission error", async () => {
    const fetchImpl = jest.fn()
      .mockResolvedValueOnce(jsonRes(200, { branchName: null, customerId: "cust-1", items: [] }))
      .mockRejectedValueOnce(new ForbiddenError("customers:read"));

    await expect(getInvoicePreviewSource("sale-1", fetchImpl as unknown as typeof fetch))
      .rejects.toThrow("No tienes permiso para ver los datos fiscales del cliente");
  });
});
