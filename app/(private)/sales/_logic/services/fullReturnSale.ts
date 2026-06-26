import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import { SaleNotFoundError, SaleScopingForbiddenError, SaleAlreadyFullyReturnedError } from "../errors";

export interface FullReturnSaleBody {
  reason: string;
  notes?: string | null;
  returnedAt?: string;
}

export async function fullReturnSale(
  saleId: string,
  body: FullReturnSaleBody,
  fetchImpl = authFetch,
): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/sales/${saleId}/full-return`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 404) throw new SaleNotFoundError();
  if (res.status === 403) throw new SaleScopingForbiddenError();
  if (res.status === 409) {
    const data = await res.json().catch(() => ({})) as { error?: string };
    if (data.error === "SaleAlreadyFullyReturned") throw new SaleAlreadyFullyReturnedError();
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
}
