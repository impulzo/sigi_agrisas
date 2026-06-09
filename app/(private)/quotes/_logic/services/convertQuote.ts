import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import {
  QuoteConvertForbiddenError,
  QuoteExpiredError,
  QuoteNotEditableError,
  FolioInactiveError,
  PaymentMethodInactiveError,
} from "../errors";
import type { ConvertQuoteBody } from "../types/api";
import type { SaleDetailDto } from "../../../sales/_logic/types/api";
import type { SaleDetail } from "../../../sales/_logic/types/domain";
import { toSaleDetail } from "../../../sales/_logic/services/_mappers";

export async function convertQuote(
  id: string,
  body: ConvertQuoteBody,
  fetchImpl = authFetch,
): Promise<SaleDetail> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/quotes/${id}/convert`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 403) throw new QuoteConvertForbiddenError();
  if (res.status === 409) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg = typeof err.error === "string" ? err.error.toLowerCase() : "";
    if (msg.includes("expir")) throw new QuoteExpiredError();
    const status = err.status as string | undefined;
    throw new QuoteNotEditableError(status ?? "unknown");
  }
  if (res.status === 400) {
    const err = await res.json().catch(() => ({})) as Record<string, unknown>;
    const msg = typeof err.error === "string" ? err.error.toLowerCase() : "";
    if (msg.includes("folio") && msg.includes("inactive")) throw new FolioInactiveError();
    if (msg.includes("payment") && msg.includes("inactive")) throw new PaymentMethodInactiveError();
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as SaleDetailDto;
  return toSaleDetail(dto);
}
