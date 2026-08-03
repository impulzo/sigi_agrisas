import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import { InvoiceNotFoundError, InvoiceNoEmailError, InvoiceNotStampedError, InvoiceEmailSendFailedError, BillingForbiddenError } from "../errors";

export async function sendInvoiceEmail(
  id: string,
  email?: string,
  fetchImpl = authFetch,
): Promise<{ sentTo: string }> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/invoices/${id}/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(email ? { email } : {}),
    });
  } catch (err) {
    if (err instanceof ForbiddenError) throw new BillingForbiddenError();
    throw new NetworkError();
  }

  if (res.status === 404) throw new InvoiceNotFoundError();
  if (res.status === 502) throw new InvoiceEmailSendFailedError();
  if (res.status === 400) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    if (body.error === "Customer has no email and no override provided") throw new InvoiceNoEmailError();
    if (body.error === "Invoice has not been stamped") throw new InvoiceNotStampedError();
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();

  return res.json() as Promise<{ sentTo: string }>;
}
