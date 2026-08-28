import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import { UserNotFoundError, EmailDeliveryFailedError } from "../errors";

export async function resendSetPasswordEmail(
  id: string,
  fetchImpl = authFetch
): Promise<{ sentTo: string }> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/users/${id}/resend-set-password-email`, {
      method: "POST",
    });
  } catch (err) {
    if (err instanceof ForbiddenError || err instanceof NetworkError) throw err;
    throw new NetworkError();
  }
  if (res.status === 404) throw new UserNotFoundError();
  if (res.status === 502) throw new EmailDeliveryFailedError();
  if (!res.ok) throw new NetworkError();
  return (await res.json()) as { sentTo: string };
}
