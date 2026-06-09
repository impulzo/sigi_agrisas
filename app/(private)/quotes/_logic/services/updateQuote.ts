import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import { QuoteNotEditableError, QuoteWriteForbiddenError } from "../errors";
import type { UpdateQuoteBody, QuoteDetailDto } from "../types/api";
import type { QuoteDetail } from "../types/domain";
import { mapDtoToQuoteDetail } from "./_mappers";

export async function updateQuote(
  id: string,
  body: UpdateQuoteBody,
  fetchImpl = authFetch,
): Promise<QuoteDetail> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/quotes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 403) throw new QuoteWriteForbiddenError();
  if (res.status === 409) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    const status = err.status as string | undefined;
    throw new QuoteNotEditableError(status ?? "unknown");
  }
  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as QuoteDetailDto;
  return mapDtoToQuoteDetail(dto);
}
