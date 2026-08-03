import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { ListPurchasesRequest, ListPurchasesResponse } from "../types/api";
import type { Purchase } from "../types/domain";
import { PurchaseReadForbiddenError, PurchaseScopingForbiddenError } from "../errors";
import { mapPurchaseDto } from "../_mappers";

export async function listPurchases(
  req: ListPurchasesRequest & { signal?: AbortSignal },
  fetchImpl = authFetch,
): Promise<{ items: Purchase[]; total: number; page: number; pageSize: number }> {
  const { page = 1, pageSize = 20, status, branchId, providerId, from, to, signal } = req;
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) {
    const arr = Array.isArray(status) ? status : [status];
    if (arr.length) params.set("status", arr.join(","));
  }
  if (branchId) params.set("branchId", branchId);
  if (providerId) params.set("providerId", providerId);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/purchases?${params.toString()}`, { signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (err instanceof ForbiddenError) {
      if (err.required === "branches:access_all") throw new PurchaseScopingForbiddenError();
      throw new PurchaseReadForbiddenError();
    }
    throw new NetworkError();
  }

  if (!res.ok) throw new NetworkError();

  const body = await res.json() as ListPurchasesResponse;
  return {
    items: body.items.map(mapPurchaseDto),
    total: body.total,
    page: body.page,
    pageSize: body.pageSize,
  };
}
