import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { EditSaleBody, SaleDetailDto } from "../types/api";
import type { SaleDetail } from "../types/domain";
import { SaleNotFoundError, CancelledSaleNotEditableError, SaleScopingForbiddenError, SaleNotInHeadquartersError } from "../errors";
import { toSaleDetail } from "./_mappers";

export async function editSale(
  id: string,
  body: EditSaleBody,
  fetchImpl = authFetch,
): Promise<SaleDetail> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/sales/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 404) throw new SaleNotFoundError();
  if (res.status === 403) {
    let errBody: { error?: string } = {};
    try { errBody = await res.json(); } catch { /* ignore */ }
    const msg = (errBody.error ?? "").toLowerCase();
    if (msg.includes("headquarter") || msg.includes("matrix") || msg.includes("hq")) {
      throw new SaleNotInHeadquartersError();
    }
    throw new SaleScopingForbiddenError();
  }
  if (res.status === 409) {
    const errBody = await res.json().catch(() => ({ error: "" })) as { error?: string };
    const msg = (errBody.error ?? "").toLowerCase();
    if (msg.includes("cancel")) throw new CancelledSaleNotEditableError();
  }
  if (!res.ok) throw new NetworkError();

  const dto = await res.json() as SaleDetailDto;
  return toSaleDetail(dto);
}
