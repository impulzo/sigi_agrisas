import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import type { TicketSettingsDto, UpdateTicketSettingsBody } from "../types/api";

export async function updateTicketSettings(
  body: UpdateTicketSettingsBody,
  fetchImpl: typeof authFetch = authFetch,
): Promise<TicketSettingsDto> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/settings/ticket", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
  return res.json() as Promise<TicketSettingsDto>;
}
