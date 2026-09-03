// `jose` ships ESM-only builds ts-jest can't transform; mocked so we control
// what jwtVerify resolves to (same pattern as mocking @react-pdf/renderer
// elsewhere in this suite).
const jwtVerifyMock = jest.fn();
jest.mock("jose", () => ({ jwtVerify: (...args: unknown[]) => jwtVerifyMock(...args) }));

import { NextRequest } from "next/server";
import { authMiddleware } from "@/modules/auth/infrastructure/middleware/AuthMiddlewareAdapter";

const IDENTITY_HEADERS = ["x-user-id", "x-user-email", "x-user-roles", "x-user-branch-id"];

describe("authMiddleware — public routes strip spoofed identity headers", () => {
  it("removes x-user-* headers a client sends to a public API route before forwarding", async () => {
    const req = new NextRequest("http://localhost/api/v1/auth/login", {
      method: "POST",
      headers: {
        "x-user-id": "attacker-id",
        "x-user-email": "attacker@evil.com",
        "x-user-roles": "admin",
        "x-user-branch-id": "some-branch",
      },
    });

    const res = await authMiddleware(req);

    // NextResponse.next({ request: { headers } }) encodes the rewritten
    // request headers as `x-middleware-request-*` on the returned response —
    // absence here means the header was stripped before forwarding.
    for (const header of IDENTITY_HEADERS) {
      expect(res.headers.get(`x-middleware-request-${header}`)).toBeNull();
    }
  });

  it("removes x-user-* headers for a public page route before forwarding", async () => {
    const req = new NextRequest("http://localhost/auth/login", {
      headers: { "x-user-id": "attacker-id" },
    });

    const res = await authMiddleware(req);

    expect(res.headers.get("x-middleware-request-x-user-id")).toBeNull();
  });
});

describe("authMiddleware — protected routes still forward real identity", () => {
  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = "test-access-secret-32chars-long!!";
    jwtVerifyMock.mockReset();
  });

  it("forwards x-user-id from a verified JWT payload on a protected API route", async () => {
    jwtVerifyMock.mockResolvedValue({
      payload: { sub: "real-user-id", email: "real@example.com", roles: ["admin"], branchId: null },
    });

    const req = new NextRequest("http://localhost/api/v1/admin/departments", {
      headers: { authorization: "Bearer valid-token" },
    });

    const res = await authMiddleware(req);

    expect(res.headers.get("x-middleware-request-x-user-id")).toBe("real-user-id");
    expect(res.headers.get("x-middleware-request-x-user-email")).toBe("real@example.com");
  });
});
