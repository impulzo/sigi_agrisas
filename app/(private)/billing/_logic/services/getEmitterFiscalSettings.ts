import { authFetch, NetworkError } from "../../../../_lib/authFetch";

export interface EmitterFiscalSettingsDto {
  rfc: string | null;
  legalName: string | null;
  fiscalRegime: string | null;
  zipCode: string | null;
  address: string | null;
}

export async function getEmitterFiscalSettings(
  fetchImpl = authFetch,
): Promise<EmitterFiscalSettingsDto> {
  const res = await fetchImpl("/api/v1/admin/billing/emitter-fiscal-settings");
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<EmitterFiscalSettingsDto>;
}
