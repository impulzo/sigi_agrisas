import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import { TicketLogoTooLargeError, TicketLogoInvalidFormatError } from "../errors";

/** Signature matches `ImageUploadField`'s `uploadFn(id, file)` — `id` is ignored (ticket settings is a singleton). */
export async function uploadTicketLogo(
  _id: string,
  file: File,
  fetchImpl: typeof authFetch = authFetch,
): Promise<string> {
  const body = new FormData();
  body.append("file", file);

  let res: Response;
  try {
    res = await fetchImpl("/api/v1/admin/settings/ticket/logo", { method: "POST", body });
  } catch {
    throw new NetworkError();
  }

  if (res.status === 413) throw new TicketLogoTooLargeError();
  if (res.status === 400) {
    const data = await res.json().catch(() => ({}));
    if ((data as { error?: string }).error === "Invalid image format") throw new TicketLogoInvalidFormatError();
    throw new NetworkError();
  }
  if (!res.ok) throw new NetworkError();

  const { logoUrl } = (await res.json()) as { logoUrl: string };
  return logoUrl;
}
