import { NextRequest } from "next/server";
import { verifyCronSecret } from "@/shared/infrastructure/http/verifyCronSecret";

function reqWithAuth(header: string | null): NextRequest {
  const headers = new Headers();
  if (header !== null) headers.set("authorization", header);
  return new NextRequest("http://localhost/api/v1/admin/cron/inventory-expiry-notifications", {
    method: "POST",
    headers,
  });
}

describe("verifyCronSecret", () => {
  const originalEnv = process.env.CRON_SECRET;

  afterEach(() => {
    process.env.CRON_SECRET = originalEnv;
  });

  it("returns null (allowed) when the bearer token matches CRON_SECRET", () => {
    process.env.CRON_SECRET = "s3cr3t";
    const result = verifyCronSecret(reqWithAuth("Bearer s3cr3t"));
    expect(result).toBeNull();
  });

  it("returns 401 when the header is missing", () => {
    process.env.CRON_SECRET = "s3cr3t";
    const result = verifyCronSecret(reqWithAuth(null));
    expect(result?.status).toBe(401);
  });

  it("returns 401 when the token does not match", () => {
    process.env.CRON_SECRET = "s3cr3t";
    const result = verifyCronSecret(reqWithAuth("Bearer wrong"));
    expect(result?.status).toBe(401);
  });

  it("returns 401 when CRON_SECRET is not configured, even with a header sent", () => {
    delete process.env.CRON_SECRET;
    const result = verifyCronSecret(reqWithAuth("Bearer anything"));
    expect(result?.status).toBe(401);
  });
});
