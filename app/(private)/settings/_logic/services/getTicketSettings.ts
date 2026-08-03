import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { TicketSettingsDto } from "../types/api";

export async function getTicketSettings(fetchImpl: typeof authFetch = authFetch): Promise<TicketSettingsDto> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/settings/ticket");
  } catch {
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<TicketSettingsDto>;
}
