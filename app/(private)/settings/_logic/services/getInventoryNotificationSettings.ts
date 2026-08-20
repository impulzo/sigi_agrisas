import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { InventoryNotificationSettingsDto } from "../types/api";

export async function getInventoryNotificationSettings(
  fetchImpl: typeof authFetch = authFetch,
): Promise<InventoryNotificationSettingsDto> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/settings/inventory-notifications");
  } catch {
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<InventoryNotificationSettingsDto>;
}
