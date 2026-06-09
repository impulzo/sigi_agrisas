import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import { QuoteAuthorizeForbiddenError, QuoteExpiredError, QuoteNotEditableError } from "../errors";
import type { AuthorizeQuoteBody, QuoteDetailDto } from "../types/api";
import type { QuoteDetail } from "../types/domain";
import { mapDtoToQuoteDetail } from "./_mappers";

export async function authorizeQuote(
  id: string,
  body: AuthorizeQuoteBody,
  fetchImpl = authFetch,
): Promise<QuoteDetail> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/quotes/${id}/authorize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 403) throw new QuoteAuthorizeForbiddenError();
  if (res.status === 409) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg = typeof err.error === "string" ? err.error.toLowerCase() : "";
    if (msg.includes("expir")) throw new QuoteExpiredError();
    const status = err.status as string | undefined;
    throw new QuoteNotEditableError(status ?? "unknown");
  }
  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as QuoteDetailDto;
  return mapDtoToQuoteDetail(dto);
}
