import { softDeletePaymentMethod } from "../../../../../../../app/(private)/catalogs/payment-methods/_logic/services/softDeletePaymentMethod";
import { PaymentMethodNotFoundError } from "../../../../../../../app/(private)/catalogs/payment-methods/_logic/errors";

describe("softDeletePaymentMethod", () => {
  it("returns void (undefined) on 204", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 204,
      json: async () => ({}),
    } as Response);

    const result = await softDeletePaymentMethod({ id: "pm-1" }, mockFetch);

    expect(result).toBeUndefined();
  });

  it("throws PaymentMethodNotFoundError on 404", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "Not found" }),
    } as Response);

    await expect(softDeletePaymentMethod({ id: "pm-999" }, mockFetch)).rejects.toBeInstanceOf(
      PaymentMethodNotFoundError
    );
  });
});
