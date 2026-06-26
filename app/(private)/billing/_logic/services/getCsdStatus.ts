import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { CsdStatusDto } from "../types/api";
import { FacturamaCsdError, BillingForbiddenError } from "../errors";

export async function getCsdStatus(
  rfc?: string,
  fetchImpl = authFetch,
): Promise<CsdStatusDto> {
  const params = rfc ? `?rfc=${encodeURIComponent(rfc)}` : "";
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/billing/csd${params}`);
  } catch (err) {
    if (err instanceof ForbiddenError) throw new BillingForbiddenError();
    throw new NetworkError();
  }

  if (res.status === 422) {
    const resBody = await res.json() as { error: string; detail?: string };
    throw new FacturamaCsdError(resBody.detail ?? resBody.error);
  }

  if (!res.ok) throw new NetworkError();

  return res.json() as Promise<CsdStatusDto>;
}
