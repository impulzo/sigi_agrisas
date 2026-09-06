const UUID_SEGMENT_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Strips resource identifiers (UUIDs) and the query string from a URL before
 * it leaves the browser toward Vercel — sale/customer/quote IDs are business
 * data that must never reach a third-party analytics endpoint.
 */
export function redactSpeedInsightsUrl(rawUrl: string): string {
  let url: URL;
  try {
    url = new URL(rawUrl, "http://placeholder.invalid");
  } catch {
    return rawUrl;
  }

  const redactedPath = url.pathname
    .split("/")
    .map((segment) => (UUID_SEGMENT_RE.test(segment) ? ":id" : segment))
    .join("/");

  const isAbsolute = /^[a-z][a-z0-9+.-]*:\/\//i.test(rawUrl);
  return isAbsolute ? `${url.origin}${redactedPath}` : redactedPath;
}
