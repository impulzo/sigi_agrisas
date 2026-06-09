/**
 * @jest-environment node
 */
import { cancelPayment } from "../../../../../../app/(private)/payments/_logic/services/cancelPayment";
import { PaymentAlreadyCancelledError } from "../../../../../../app/(private)/payments/_logic/errors";

function mockFetch(status: number, body: unknown): typeof fetch {
  return jest.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  }) as unknown as typeof fetch;
}

describe("cancelPayment", () => {
  it("happy path — resolves when 200", async () => {
    const fetch = mockFetch(200, {});
    await expect(cancelPayment("p1", {}, fetch)).resolves.toBeUndefined();
  });

  it("throws PaymentAlreadyCancelledError on 409 PaymentAlreadyCancelled", async () => {
    const fetch = mockFetch(409, { error: "PaymentAlreadyCancelled" });
    await expect(cancelPayment("p1", {}, fetch)).rejects.toBeInstanceOf(PaymentAlreadyCancelledError);
  });

  it("passes reason in request body", async () => {
    const fetchFn = mockFetch(200, {});
    await cancelPayment("p1", { reason: "Error de captura" }, fetchFn);
    const call = (fetchFn as jest.Mock).mock.calls[0];
    const body = JSON.parse(call[1].body as string);
    expect(body.reason).toBe("Error de captura");
  });
});
