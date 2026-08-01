import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { ListWaybillsRequest, WaybillListResponse } from "../types/api";
import type { WaybillSummary } from "../types/domain";
import { WaybillReadForbiddenError, WaybillScopingForbiddenError } from "../errors";
import { mapWaybillSummaryDto } from "../_mappers";

export async function listWaybills(
  req: ListWaybillsRequest & { signal?: AbortSignal },
  fetchImpl = authFetch
): Promise<{ items: WaybillSummary[]; total: number; page: number; pageSize: number }> {
  const { page = 1, pageSize = 20, status, type, branchId, from, to, signal } = req;
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) {
    const arr = Array.isArray(status) ? status : [status];
    if (arr.length) params.set("status", arr.join(","));
  }
  if (type) {
    const arr = Array.isArray(type) ? type : [type];
    if (arr.length) params.set("type", arr.join(","));
  }
  if (branchId) params.set("branchId", branchId);
  if (from) params.set("from", from);
  if (to) params.set("to", to);

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/waybills?${params.toString()}`, { signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    if (err instanceof ForbiddenError) {
      if (err.required === "branches:access_all") throw new WaybillScopingForbiddenError();
      throw new WaybillReadForbiddenError();
    }
    throw new NetworkError();
  }

  if (!res.ok) throw new NetworkError();

  const body = (await res.json()) as WaybillListResponse;
  return {
    items: body.items.map(mapWaybillSummaryDto),
    total: body.total,
    page: body.page,
    pageSize: body.pageSize,
  };
}
