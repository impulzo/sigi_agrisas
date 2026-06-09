import { createPaymentMethod } from "../../../../../../../app/(private)/catalogs/payment-methods/_logic/services/createPaymentMethod";
import { NetworkError } from "../../../../../../../app/_lib/authFetch";
import { PaymentMethodCodeAlreadyInUseError } from "../../../../../../../app/(private)/catalogs/payment-methods/_logic/errors";

const baseDto = {
  id: "pm-1",
  code: "CASH",
  name: "Efectivo",
  description: null,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

describe("createPaymentMethod", () => {
  it("returns PaymentMethod on 201 success", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => baseDto,
    } as Response);

    const result = await createPaymentMethod({ body: { code: "CASH", name: "Efectivo" } }, mockFetch);

    expect(result.id).toBe("pm-1");
    expect(result.code).toBe("CASH");
    expect(result.createdAt).toBeInstanceOf(Date);
  });

  it("throws PaymentMethodCodeAlreadyInUseError on 409", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "Payment method code already in use" }),
    } as Response);

    await expect(
      createPaymentMethod({ body: { code: "CASH", name: "Efectivo" } }, mockFetch)
    ).rejects.toBeInstanceOf(PaymentMethodCodeAlreadyInUseError);
  });

  it("throws NetworkError on 400", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: "Bad request" }),
    } as Response);

    await expect(
      createPaymentMethod({ body: { code: "CASH", name: "Efectivo" } }, mockFetch)
    ).rejects.toBeInstanceOf(NetworkError);
  });
});
