import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../_lib/authFetch";
import type { SendMyPasswordLinkResponse } from "../types/api";
import { PasswordLinkSendError, PasswordLinkRateLimitedError } from "../errors";

export async function sendMyPasswordLink(
  fetchImpl: typeof authFetch = authFetch
): Promise<SendMyPasswordLinkResponse> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/auth/send-password-link", { method: "POST" });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 429) {
    let retryAfterSeconds: number | undefined;
    try {
      const body = await res.json();
      if (typeof body?.retryAfterSeconds === "number") retryAfterSeconds = body.retryAfterSeconds;
    } catch {
      // body no parseable — se usa el mensaje por defecto de PasswordLinkRateLimitedError
    }
    throw new PasswordLinkRateLimitedError(retryAfterSeconds);
  }
  if (res.status === 502) throw new PasswordLinkSendError();
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<SendMyPasswordLinkResponse>;
}
