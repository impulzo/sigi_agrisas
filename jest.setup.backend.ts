// Integration tests hit real DB over the network — 5 s is too tight
jest.setTimeout(60_000);

// Polyfill Response.json() static method for Node 18 (added in Node 22)
// NextResponse.json() internally calls Response.json() which is unavailable in Node < 22
if (!("json" in Response)) {
  (Response as unknown as { json: (data: unknown, init?: ResponseInit) => Response }).json = function (
    data: unknown,
    init?: ResponseInit
  ): Response {
    const body = JSON.stringify(data);
    const headers = new Headers(init?.headers);
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    return new Response(body, { ...init, headers });
  };
}
