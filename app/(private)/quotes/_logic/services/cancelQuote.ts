import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import {
  QuoteCancelForbiddenError,
  QuoteAlreadyCancelledError,
  QuoteAlreadyConvertedError,
} from "../errors";
import type { CancelQuoteBody, QuoteDetailDto } from "../types/api";
import type { QuoteDetail } from "../types/domain";
import { mapDtoToQuoteDetail } from "./_mappers";

export async function cancelQuote(
  id: string,
  body: CancelQuoteBody,
  fetchImpl = authFetch,
): Promise<QuoteDetail> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/quotes/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 403) throw new QuoteCancelForbiddenError();
  if (res.status === 409) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    const saleId = err.saleId as string | undefined;
    if (saleId) throw new QuoteAlreadyConvertedError(saleId);
    throw new QuoteAlreadyCancelledError();
  }
  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as QuoteDetailDto;
  return mapDtoToQuoteDetail(dto);
}
