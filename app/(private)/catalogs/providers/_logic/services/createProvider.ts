import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { CreateProviderBody, ProviderDto } from "../types/api";
import type { Provider } from "../types/domain";
import { ProviderCodeAlreadyInUseError, ProviderRfcAlreadyInUseError } from "../errors";
import { toProvider } from "./listProviders";

export async function createProvider(
  { body }: { body: CreateProviderBody },
  fetchImpl = authFetch,
): Promise<Provider> {
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
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 409) {
    const err = await res.json().catch(() => ({ error: "" }));
    const message = String(err?.error ?? "");
    if (message.includes("RFC already in use")) throw new ProviderRfcAlreadyInUseError();
    if (message.includes("code already in use")) throw new ProviderCodeAlreadyInUseError();
    throw new ProviderCodeAlreadyInUseError();
  }
  if (!res.ok) throw new NetworkError();
  const data = (await res.json()) as ProviderDto;
  return toProvider(data);
}
