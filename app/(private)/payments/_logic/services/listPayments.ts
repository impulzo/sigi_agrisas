import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { ListPaymentsRequest, ListPaymentsResponse } from "../types/api";
import type { Payment } from "../types/domain";

function mapPaymentDto(dto: ListPaymentsResponse["items"][number]): Payment {
  return {
    ...dto,
    amount: parseFloat(dto.amount as unknown as string),
    createdAt: new Date(dto.createdAt),
    updatedAt: new Date(dto.updatedAt),
  };
}

export async function listPayments(
  req: ListPaymentsRequest & { signal?: AbortSignal },
  fetchImpl = authFetch,
): Promise<{ items: Payment[]; total: number; page: number; pageSize: number }> {
  const { page = 1, pageSize = 20, status, branchId, search, from, to, signal } = req;
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (status) params.set("status", status);
  if (branchId) params.set("branchId", branchId);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  if (search?.trim()) params.set("search", search.trim());

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/payments?${params.toString()}`, { signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") throw err;
    throw new NetworkError();
  }

  if (!res.ok) throw new NetworkError();

  const body = await res.json() as ListPaymentsResponse;
  return {
    items: body.items.map(mapPaymentDto),
    total: body.total,
    page: body.page,
    pageSize: body.pageSize,
  };
}
