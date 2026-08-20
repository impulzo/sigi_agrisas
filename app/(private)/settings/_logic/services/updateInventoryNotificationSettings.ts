import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { InventoryNotificationSettingsDto, UpdateInventoryNotificationSettingsBody } from "../types/api";

export async function updateInventoryNotificationSettings(
  body: UpdateInventoryNotificationSettingsBody,
  fetchImpl: typeof authFetch = authFetch,
): Promise<InventoryNotificationSettingsDto> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/settings/inventory-notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<InventoryNotificationSettingsDto>;
}
