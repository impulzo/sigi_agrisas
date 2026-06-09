import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { ListSalesResponse } from "../types/api";
import type { SaleSummary } from "../types/domain";
import { SaleScopingForbiddenError } from "../errors";
import { toSaleSummary } from "./_mappers";

export interface ListSalesParams {
  page?: number;
  pageSize?: number;
  branchId?: string;
  status?: string[];
  from?: string;
  to?: string;
  search?: string;
  signal?: AbortSignal;
}

export async function listSales(
  { page = 1, pageSize = 20, branchId, status, from, to, search, signal }: ListSalesParams,
  fetchImpl = authFetch,
): Promise<{ items: SaleSummary[]; total: number; page: number; pageSize: number }> {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (branchId) params.set("branchId", branchId);
  if (status?.length) params.set("status", status.join(","));
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (search?.trim()) params.set("search", search.trim());

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/sales?${params.toString()}`, { signal });
  } catch (err) {
    if ((err as Error).name === "AbortError") throw err;
    throw new NetworkError();
  }

  if (res.status === 403) throw new SaleScopingForbiddenError();
  if (!res.ok) throw new NetworkError();

  const body = await res.json() as ListSalesResponse;
  return {
    items: body.items.map(toSaleSummary),
    total: body.total,
    page: body.page,
    pageSize: body.pageSize,
  };
}
