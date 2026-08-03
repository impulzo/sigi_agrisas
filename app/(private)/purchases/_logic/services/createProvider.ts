import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { CreateProviderBody, ProviderDto } from "../types/api";
import { ProviderCodeAlreadyInUseError, ProviderRfcAlreadyInUseError } from "../errors";

export async function createProvider(body: CreateProviderBody, fetchImpl = authFetch): Promise<ProviderDto> {
  const normalized: CreateProviderBody = {
    ...body,
    code: body.code.trim().toUpperCase(),
    rfc: body.rfc.trim().toUpperCase(),
  };

  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/providers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalized),
    });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 409) {
    const err = await res.json().catch(() => ({ error: "" })) as { error: string };
    if (err.error.includes("RFC already in use")) throw new ProviderRfcAlreadyInUseError();
    throw new ProviderCodeAlreadyInUseError();
  }
  if (!res.ok) throw new NetworkError();

  return (await res.json()) as ProviderDto;
}
