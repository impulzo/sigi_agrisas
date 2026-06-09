/**
 * @jest-environment node
 */
import { registerPayment } from "../../../../../../app/(private)/payments/_logic/services/registerPayment";
import { PaymentExceedsDueAmountError, SaleNotPayableError } from "../../../../../../app/(private)/payments/_logic/errors";

const BODY = { saleId: "s1", amount: 100, paymentMethodId: "pm1", folioId: "f1" };

function mockFetch(status: number, body: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

describe("registerPayment", () => {
  it("happy path — resolves when 201", async () => {
    const fetch = mockFetch(201, {});
    await expect(registerPayment(BODY, fetch)).resolves.toBeUndefined();
  });

  it("throws PaymentExceedsDueAmountError on 409 PaymentExceedsDueAmount", async () => {
    const fetch = mockFetch(409, { error: "PaymentExceedsDueAmount", due: "300.00" });
    await expect(registerPayment(BODY, fetch)).rejects.toBeInstanceOf(PaymentExceedsDueAmountError);
  });

  it("error message includes due amount", async () => {
    const fetch = mockFetch(409, { error: "PaymentExceedsDueAmount", due: "300.00" });
    await expect(registerPayment(BODY, fetch)).rejects.toThrow("300.00");
  });

  it("throws SaleNotPayableError on 409 SaleNotPayable", async () => {
    const fetch = mockFetch(409, { error: "SaleNotPayable" });
    await expect(registerPayment(BODY, fetch)).rejects.toBeInstanceOf(SaleNotPayableError);
  });

  it("throws Error with backend message on 400", async () => {
    const fetch = mockFetch(400, { message: "El monto es requerido" });
    await expect(registerPayment(BODY, fetch)).rejects.toThrow("El monto es requerido");
  });
});
