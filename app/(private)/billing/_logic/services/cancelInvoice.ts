import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { CancelInvoiceRequest, InvoiceDto } from "../types/api";
import type { Invoice } from "../types/domain";
import { InvoiceAlreadyCancelledError, FacturamaCancelError, BillingForbiddenError } from "../errors";
import { mapInvoiceDto } from "./_mappers";

export async function cancelInvoice(
  id: string,
  body: CancelInvoiceRequest,
  fetchImpl = authFetch,
): Promise<Invoice> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/invoices/${id}/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if (err instanceof ForbiddenError) throw new BillingForbiddenError();
    throw new NetworkError();
  }

  if (res.status === 409) throw new InvoiceAlreadyCancelledError();

  if (res.status === 422) {
    const resBody = await res.json() as { error: string; detail?: string };
    throw new FacturamaCancelError(resBody.detail ?? resBody.error);
  }

  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as InvoiceDto;
  return mapInvoiceDto(dto);
}
