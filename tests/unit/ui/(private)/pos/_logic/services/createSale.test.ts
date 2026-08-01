import { createSale } from "../../../../../../../app/(private)/pos/_logic/services/createSale";
import {
  CustomerInactiveError,
  SaleScopingForbiddenError,
  SaleCreateForbiddenError,
  CreditLimitExceededError,
  CustomerHasNoCreditLineError,
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

  it("mapea 409 'Credit limit exceeded' a CreditLimitExceededError con available", async () => {
    const fetch = mockFetch(409, { error: "Credit limit exceeded", available: "1207.9800" });
    const err = await createSale(minimalBody, fetch as never).catch((e) => e);
    expect(err).toBeInstanceOf(CreditLimitExceededError);
    expect((err as CreditLimitExceededError).available).toBe("1207.9800");
  });

  it("mapea 409 'Customer has no credit line' a CustomerHasNoCreditLineError", async () => {
    const fetch = mockFetch(409, { error: "Customer has no credit line (creditLimit is null)" });
    await expect(createSale(minimalBody, fetch as never)).rejects.toBeInstanceOf(CustomerHasNoCreditLineError);
  });

  it("mapea 409 desconocido a NetworkError", async () => {
    const fetch = mockFetch(409, { error: "Some other conflict" });
    await expect(createSale(minimalBody, fetch as never)).rejects.toBeInstanceOf(NetworkError);
  });
});
