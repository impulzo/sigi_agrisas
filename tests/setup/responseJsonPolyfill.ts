// Node < 18.13 lacks the static `Response.json()` method that `NextResponse.json()`
// relies on internally. Polyfill it so controller tests can run under the project's
// minimum Node version.
if (typeof (Response as unknown as { json?: unknown }).json !== "function") {
  (Response as unknown as { json: (body: unknown, init?: ResponseInit) => Response }).json = (
    body: unknown,
    init?: ResponseInit
  ) => {
    const headers = new Headers(init?.headers);
    if (!headers.has("content-type")) headers.set("content-type", "application/json");
    return new Response(JSON.stringify(body), { ...init, headers });
  };
}
