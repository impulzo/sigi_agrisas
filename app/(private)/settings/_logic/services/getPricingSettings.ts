import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { PricingSettingsDto } from "../types/api";

export async function getPricingSettings(fetchImpl: typeof authFetch = authFetch): Promise<PricingSettingsDto> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/settings/pricing");
  } catch {
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<PricingSettingsDto>;
}
