import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { ListInvoicesRequest, InvoiceListResponse } from "../types/api";
import type { Invoice } from "../types/domain";
import { BillingForbiddenError } from "../errors";
import { mapInvoiceDto } from "./_mappers";

export async function listInvoices(
  req: ListInvoicesRequest & { signal?: AbortSignal },
  fetchImpl = authFetch,
): Promise<{ items: Invoice[]; total: number; page: number; pageSize: number }> {
  const { page = 1, pageSize = 20, branchId, status, search, from, to, signal } = req;
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (branchId) params.set("branchId", branchId);
  if (status) params.set("status", status);
  if (search?.trim()) params.set("search", search.trim());
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/invoices?${params.toString()}`, { signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (err instanceof ForbiddenError) throw new BillingForbiddenError();
    throw new NetworkError();
  }

  if (!res.ok) throw new NetworkError();

  const body = await res.json() as InvoiceListResponse;
  return {
    items: body.items.map(mapInvoiceDto),
    total: body.total,
    page: body.page,
    pageSize: body.pageSize,
  };
}
