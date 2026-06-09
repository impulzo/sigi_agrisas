import { updatePaymentMethod } from "../../../../../../../app/(private)/catalogs/payment-methods/_logic/services/updatePaymentMethod";
import {
  PaymentMethodNotFoundError,
  PaymentMethodCodeAlreadyInUseError,
} from "../../../../../../../app/(private)/catalogs/payment-methods/_logic/errors";

const baseDto = {
  id: "pm-1",
  code: "CASH",
  name: "Efectivo actualizado",
  description: null,
  isActive: true,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
};

describe("updatePaymentMethod", () => {
  it("returns PaymentMethod on 200 success", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => baseDto,
    } as Response);

    const result = await updatePaymentMethod({ id: "pm-1", body: { name: "Efectivo actualizado" } }, mockFetch);

    expect(result.id).toBe("pm-1");
    expect(result.name).toBe("Efectivo actualizado");
    expect(result.updatedAt).toBeInstanceOf(Date);
  });

  it("throws PaymentMethodNotFoundError on 404", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    } as Response);

    await expect(
      updatePaymentMethod({ id: "pm-999", body: { name: "X" } }, mockFetch)
    ).rejects.toBeInstanceOf(PaymentMethodNotFoundError);
  });

  it("throws PaymentMethodCodeAlreadyInUseError on 409", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 409,
      json: async () => ({ error: "Payment method code already in use" }),
    } as Response);

    await expect(
      updatePaymentMethod({ id: "pm-1", body: { name: "Duplicado" } }, mockFetch)
    ).rejects.toBeInstanceOf(PaymentMethodCodeAlreadyInUseError);
  });
});
