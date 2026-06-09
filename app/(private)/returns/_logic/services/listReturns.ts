import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { ListReturnsRequest, ListReturnsResponse } from "../types/api";
import type { Return } from "../types/domain";
import { ReturnReadForbiddenError, ReturnScopingForbiddenError } from "../errors";
import { mapReturnDto } from "../_mappers";

export async function listReturns(
  req: ListReturnsRequest & { signal?: AbortSignal },
  fetchImpl = authFetch,
): Promise<{ items: Return[]; total: number; page: number; pageSize: number }> {
  const { page = 1, pageSize = 20, status, branchId, customerId, saleId, from, to, search, signal } = req;
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) {
    const arr = Array.isArray(status) ? status : [status];
    if (arr.length) params.set("status", arr.join(","));
  }
  if (branchId) params.set("branchId", branchId);
  if (customerId) params.set("customerId", customerId);
  if (saleId) params.set("saleId", saleId);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (search?.trim()) params.set("search", search.trim());

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/returns?${params.toString()}`, { signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (err instanceof ForbiddenError) {
      if (err.required === "branches:access_all") throw new ReturnScopingForbiddenError();
      throw new ReturnReadForbiddenError();
    }
    throw new NetworkError();
  }

  if (!res.ok) throw new NetworkError();

  const body = await res.json() as ListReturnsResponse;
  return {
    items: body.items.map(mapReturnDto),
    total: body.total,
    page: body.page,
    pageSize: body.pageSize,
  };
}
