import { authFetch, NetworkError } from "../../../../_lib/authFetch";

/** Signature matches `ImageUploadField`'s `deleteFn(id)` — `id` is ignored (ticket settings is a singleton). */
export async function deleteTicketLogo(
  _id: string,
  fetchImpl: typeof authFetch = authFetch,
): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/settings/ticket/logo", { method: "DELETE" });
  } catch {
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();
}
