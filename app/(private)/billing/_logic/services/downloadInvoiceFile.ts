import { authFetch, NetworkError } from "../../../../_lib/authFetch";
import { InvoiceNotFoundError, InvoiceNotStampedError, InvoiceFileDownloadFailedError } from "../errors";

export async function downloadInvoiceFile(
  id: string,
  format: "pdf" | "xml",
  fetchImpl = authFetch,
): Promise<void> {
  let res: Response;
  try {
    res = await fetchImpl(`/api/v1/admin/invoices/${id}/download?format=${format}`);
  } catch {
    throw new NetworkError();
  }

  if (res.status === 404) throw new InvoiceNotFoundError();
  if (res.status === 400) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    if (body.error === "Invoice has not been stamped") throw new InvoiceNotStampedError();
    throw new NetworkError();
  }
  if (res.status === 502) throw new InvoiceFileDownloadFailedError();
  if (!res.ok) throw new NetworkError();

  const disposition = res.headers.get("Content-Disposition") ?? "";
  const filenameMatch = /filename="?([^";]+)"?/.exec(disposition);
  const filename = filenameMatch?.[1] ?? `factura-${id}.${format}`;

  const blob = await res.blob();
  if (blob.size === 0) throw new InvoiceNotStampedError();

  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
