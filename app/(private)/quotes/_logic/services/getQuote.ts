import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import { QuoteNotFoundError, QuoteScopingForbiddenError } from "../errors";
import type { QuoteDetailDto } from "../types/api";
import type { QuoteDetail } from "../types/domain";
import { mapDtoToQuoteDetail } from "./_mappers";

export async function getQuote(id: string, fetchImpl = authFetch): Promise<QuoteDetail> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/quotes/${id}`);
  } catch {
    throw new NetworkError();
  }

  if (res.status === 404) throw new QuoteNotFoundError();
  if (res.status === 403) throw new QuoteScopingForbiddenError();
  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as QuoteDetailDto;
  return mapDtoToQuoteDetail(dto);
}
