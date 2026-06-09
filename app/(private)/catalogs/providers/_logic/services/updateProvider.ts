import { authFetch, NetworkError, UnauthenticatedError, ForbiddenError } from "../../../../../_lib/authFetch";
import type { UpdateProviderBody, ProviderDto } from "../types/api";
import type { Provider } from "../types/domain";
import { ProviderNotFoundError, ProviderRfcAlreadyInUseError } from "../errors";
import { toProvider } from "./listProviders";

export async function updateProvider(
  { id, body }: { id: string; body: UpdateProviderBody },
  fetchImpl = authFetch,
): Promise<Provider> {
  const normalized: UpdateProviderBody = { ...body };
  if (typeof normalized.rfc === "string") {
    normalized.rfc = normalized.rfc.trim().toUpperCase();
  }

  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/providers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(normalized),
    });
  } catch (err) {
    if (err instanceof NetworkError || err instanceof UnauthenticatedError || err instanceof ForbiddenError) throw err;
    throw new NetworkError();
  }
  if (res.status === 404) throw new ProviderNotFoundError();
  if (res.status === 409) {
    const err = await res.json().catch(() => ({ error: "" }));
    const message = String(err?.error ?? "");
    if (message.includes("RFC already in use")) throw new ProviderRfcAlreadyInUseError();
    throw new ProviderRfcAlreadyInUseError();
  }
  if (!res.ok) throw new NetworkError();
  const data = (await res.json()) as ProviderDto;
  return toProvider(data);
}
