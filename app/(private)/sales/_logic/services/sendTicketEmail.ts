import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import { SaleNotFoundError, SaleNoEmailError, SaleEmailSendFailedError, SaleScopingForbiddenError } from "../errors";

export async function sendTicketEmail(
  id: string,
  email?: string,
  fetchImpl = authFetch,
): Promise<{ sentTo: string }> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/sales/${id}/send-ticket-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(email ? { email } : {}),
    });
  } catch (err) {
    if (err instanceof ForbiddenError) throw new SaleScopingForbiddenError();
    throw new NetworkError();
  }

  if (res.status === 404) throw new SaleNotFoundError();
  if (res.status === 502) throw new SaleEmailSendFailedError();
  if (res.status === 400) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    if (body.error === "Customer has no email and no override provided") throw new SaleNoEmailError();
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();

  return res.json() as Promise<{ sentTo: string }>;
}
