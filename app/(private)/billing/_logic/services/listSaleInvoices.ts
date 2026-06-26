import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { InvoiceDto } from "../types/api";
import type { Invoice } from "../types/domain";
import { BillingForbiddenError } from "../errors";
import { mapInvoiceDto } from "./_mappers";

export async function listSaleInvoices(
  saleId: string,
  fetchImpl = authFetch,
): Promise<Invoice[]> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/sales/${saleId}/invoices`);
  } catch (err) {
    if (err instanceof ForbiddenError) throw new BillingForbiddenError();
    throw new NetworkError();
  }

  if (!res.ok) throw new NetworkError();

  const body = await res.json() as { items: InvoiceDto[] };
  return body.items.map(mapInvoiceDto);
}
