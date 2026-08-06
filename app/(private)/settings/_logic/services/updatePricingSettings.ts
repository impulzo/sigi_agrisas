import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { PricingSettingsDto, UpdatePricingSettingsBody } from "../types/api";

export async function updatePricingSettings(
  body: UpdatePricingSettingsBody,
  fetchImpl: typeof authFetch = authFetch,
): Promise<PricingSettingsDto> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/settings/pricing", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<PricingSettingsDto>;
}
