import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import { QuoteScopingForbiddenError } from "../errors";
import type { ListQuotesResponse, QuoteDto } from "../types/api";
import type { Quote, QuoteListFilters } from "../types/domain";
import { mapDtoToQuote } from "./_mappers";

interface ListQuotesResult {
  items: Quote[];
  total: number;
  page: number;
  pageSize: number;
}

export async function listQuotes(
  filters: QuoteListFilters,
  fetchImpl = authFetch,
): Promise<ListQuotesResult> {
  const params = new URLSearchParams();
  params.set("page", String(filters.page));
  params.set("pageSize", String(filters.pageSize));
  if (filters.branchId) params.set("branchId", filters.branchId);
  if (filters.customerId) params.set("customerId", filters.customerId);
  if (filters.status) params.set("status", filters.status);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.search && filters.search.length >= 2) params.set("search", filters.search);

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/quotes?${params.toString()}`);
  } catch {
    throw new NetworkError();
  }

  if (res.status === 403) throw new QuoteScopingForbiddenError();
  if (!res.ok) throw new NetworkError();

  const body: ListQuotesResponse = await res.json();
  return {
    items: body.items.map((dto: QuoteDto) => mapDtoToQuote(dto)),
    total: body.total,
    page: body.page,
    pageSize: body.pageSize,
  };
}
