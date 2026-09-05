import { sendMyPasswordLink } from "../../../../../app/(private)/account/_logic/services/sendMyPasswordLink";
import { NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../app/_lib/authFetch";
import { PasswordLinkSendError, PasswordLinkRateLimitedError } from "../../../../../app/(private)/account/_logic/errors";

describe("sendMyPasswordLink", () => {
  it("returns sentTo on 200", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ sentTo: "user@example.com" }),
    } as Response);

    const result = await sendMyPasswordLink(mockFetch);

    expect(result).toEqual({ sentTo: "user@example.com" });
    expect(mockFetch).toHaveBeenCalledWith("/api/v1/auth/send-password-link", { method: "POST" });
  });

  it("throws PasswordLinkSendError on 502 (EmailDeliveryFailed)", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 502,
      json: async () => ({ error: "EmailDeliveryFailed" }),
    } as Response);

    await expect(sendMyPasswordLink(mockFetch)).rejects.toBeInstanceOf(PasswordLinkSendError);
  });

  it("throws NetworkError on other non-ok statuses", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: "User not found" }),
    } as Response);

    await expect(sendMyPasswordLink(mockFetch)).rejects.toBeInstanceOf(NetworkError);
  });

  it("re-throws NetworkError on a real fetch failure", async () => {
    const mockFetch = jest.fn().mockRejectedValueOnce(new NetworkError());

    await expect(sendMyPasswordLink(mockFetch)).rejects.toBeInstanceOf(NetworkError);
  });

  it("re-throws UnauthenticatedError instead of collapsing it to a generic NetworkError", async () => {
    const mockFetch = jest.fn().mockRejectedValueOnce(new UnauthenticatedError());

    await expect(sendMyPasswordLink(mockFetch)).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("re-throws ForbiddenError instead of collapsing it to a generic NetworkError", async () => {
    const mockFetch = jest.fn().mockRejectedValueOnce(new ForbiddenError());

    await expect(sendMyPasswordLink(mockFetch)).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws PasswordLinkRateLimitedError with retryAfterSeconds on 429", async () => {
    const mockFetch = jest.fn().mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ error: "TooManyRequests", retryAfterSeconds: 42 }),
    } as Response);

    const err = await sendMyPasswordLink(mockFetch).catch((e) => e);

    expect(err).toBeInstanceOf(PasswordLinkRateLimitedError);
    expect(err.retryAfterSeconds).toBe(42);
  });
});
