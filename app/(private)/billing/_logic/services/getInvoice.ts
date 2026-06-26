import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { InvoiceDto } from "../types/api";
import type { Invoice } from "../types/domain";
import { InvoiceNotFoundError, BillingForbiddenError } from "../errors";
import { mapInvoiceDto } from "./_mappers";

export async function getInvoice(
  id: string,
  fetchImpl = authFetch,
): Promise<Invoice> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/invoices/${id}`);
  } catch (err) {
    if (err instanceof ForbiddenError) throw new BillingForbiddenError();
    throw new NetworkError();
  }

  if (res.status === 404) throw new InvoiceNotFoundError();
  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as InvoiceDto;
  return mapInvoiceDto(dto);
}
