import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_PATHS = [
  "/api/v1/auth/login",
  "/api/v1/auth/register",
  "/api/v1/auth/refresh",
  "/api/v1/auth/logout",
  "/api/v1/health",
  "/auth/login",
  "/auth/register",
  "/favicon.ico",
];

const PUBLIC_PREFIXES = ["/_next/"];

function isPublic(pathname: string): boolean {
  if (PUBLIC_PATHS.includes(pathname)) return true;
  return PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function extractBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

export async function authMiddleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const token = extractBearerToken(req);
  const rawSecret = process.env.JWT_ACCESS_SECRET;

  if (!token || !rawSecret) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  try {
    const secret = new TextEncoder().encode(rawSecret);
    const { payload } = await jwtVerify(token, secret);
    const requestHeaders = new Headers(req.headers);
    requestHeaders.set("x-user-id", (payload.sub as string) ?? "");
    requestHeaders.set("x-user-email", (payload.email as string) ?? "");
    return NextResponse.next({ request: { headers: requestHeaders } });
  } catch (err) {
    if (pathname.startsWith("/api/")) {
      const isExpired =
        typeof err === "object" &&
        err !== null &&
        (err as { code?: string }).code === "ERR_JWT_EXPIRED";
      return NextResponse.json(
        { error: isExpired ? "Token expired" : "Unauthorized" },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }
}
