import { createSale } from "../../../../../../../app/(private)/pos/_logic/services/createSale";
import {
  CustomerInactiveError,
  SaleScopingForbiddenError,
  SaleCreateForbiddenError,
} from "../../../../../../../app/(private)/pos/_logic/errors";
import { NetworkError } from "../../../../../../../app/_lib/authFetch";

function mockFetch(status: number, body: unknown) {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

const minimalBody = {
  branchId: "branch-1",
  folioId: "folio-1",
  paymentMethodId: "pm-1",
  items: [{ productId: "prod-1", productPriceId: "price-1", quantity: 1 }],
};

describe("createSale", () => {
  it("devuelve el SaleDetailDto en éxito 201", async () => {
    const dto = { id: "sale-1", status: "completed", total: 116, items: [] };
    const fetch = mockFetch(201, dto);
    const result = await createSale(minimalBody, fetch as never);
    expect(result.id).toBe("sale-1");
    expect(result.status).toBe("completed");
  });

  it("mapea 400 con 'customer' + 'inactive' a CustomerInactiveError", async () => {
    const fetch = mockFetch(400, { error: "Customer is inactive" });
    await expect(createSale(minimalBody, fetch as never)).rejects.toBeInstanceOf(CustomerInactiveError);
  });

  it("mapea 403 con mensaje de scope a SaleScopingForbiddenError", async () => {
    const fetch = mockFetch(403, { error: "branch scope mismatch" });
    await expect(createSale(minimalBody, fetch as never)).rejects.toBeInstanceOf(SaleScopingForbiddenError);
  });

  it("mapea 403 sin mensaje de scope a SaleCreateForbiddenError", async () => {
    const fetch = mockFetch(403, { error: "Forbidden" });
    await expect(createSale(minimalBody, fetch as never)).rejects.toBeInstanceOf(SaleCreateForbiddenError);
  });

  it("lanza NetworkError en fallo de red", async () => {
    const fetch = jest.fn().mockRejectedValue(new Error("network error"));
    await expect(createSale(minimalBody, fetch as never)).rejects.toBeInstanceOf(NetworkError);
  });
});
