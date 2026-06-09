import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import {
  QuoteCreateForbiddenError,
  QuoteScopingForbiddenError,
  CustomerInactiveError,
  BranchInactiveError,
  FolioInactiveError,
  ProductInactiveError,
  ProductPriceMismatchError,
  EmptyQuoteError,
} from "../errors";
import type { CreateQuoteBody, QuoteDetailDto } from "../types/api";
import type { QuoteDetail } from "../types/domain";
import { mapDtoToQuoteDetail } from "./_mappers";

export async function createQuote(
  body: CreateQuoteBody,
  fetchImpl = authFetch,
): Promise<QuoteDetail> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/quotes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 403) throw new QuoteCreateForbiddenError();
  if (res.status === 400) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg = typeof err.error === "string" ? err.error.toLowerCase() : "";
    if (msg.includes("customer") && msg.includes("inactive")) throw new CustomerInactiveError();
    if (msg.includes("branch") && msg.includes("inactive")) throw new BranchInactiveError();
    if (msg.includes("folio") && msg.includes("inactive")) throw new FolioInactiveError();
    if (msg.includes("product") && msg.includes("inactive")) throw new ProductInactiveError();
    if (msg.includes("price") && msg.includes("mismatch")) throw new ProductPriceMismatchError();
    if (msg.includes("empty") || msg.includes("items")) throw new EmptyQuoteError();
    throw new NetworkError();
  }

  if (res.status === 409) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg = typeof err.error === "string" ? err.error.toLowerCase() : "";
    if (msg.includes("scop") || msg.includes("branch")) throw new QuoteScopingForbiddenError();
    throw new NetworkError();
  }

  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as QuoteDetailDto;
  return mapDtoToQuoteDetail(dto);
}
