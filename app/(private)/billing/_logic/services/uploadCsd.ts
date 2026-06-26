import { authFetch, ForbiddenError, NetworkError } from "../../../../_lib/authFetch";
import type { UploadCsdRequest, CsdStatusDto } from "../types/api";
import { FacturamaCsdError, BillingForbiddenError } from "../errors";

export async function uploadCsd(
  body: UploadCsdRequest,
  fetchImpl = authFetch,
): Promise<CsdStatusDto> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/billing/csd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
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
