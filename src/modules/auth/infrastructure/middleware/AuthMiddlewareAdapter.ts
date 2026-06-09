import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const REFRESH_TOKEN_COOKIE = "refreshToken";

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

function propagateIdentity(
  req: NextRequest,
  payload: { sub?: unknown; email?: unknown; roles?: unknown; branchId?: unknown }
): NextResponse {
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-user-id", (payload.sub as string) ?? "");
  requestHeaders.set("x-user-email", (payload.email as string) ?? "");
  requestHeaders.set(
    "x-user-roles",
    Array.isArray(payload.roles) ? (payload.roles as string[]).join(",") : ""
  );
  requestHeaders.set("x-user-branch-id", (payload.branchId as string) ?? "");
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function authMiddleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) return NextResponse.next();

  const isApi = pathname.startsWith("/api/");

  if (isApi) {
    const token = extractBearerToken(req);
    const rawSecret = process.env.JWT_ACCESS_SECRET;

    if (!token || !rawSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
      const secret = new TextEncoder().encode(rawSecret);
      const { payload } = await jwtVerify(token, secret);
      return propagateIdentity(req, payload);
    } catch (err) {
      const isExpired =
        typeof err === "object" &&
        err !== null &&
        (err as { code?: string }).code === "ERR_JWT_EXPIRED";
      return NextResponse.json(
        { error: isExpired ? "Token expired" : "Unauthorized" },
        { status: 401 }
      );
    }
  }

  // Página privada: el navegador no envía Bearer en navegaciones,
  // así que validamos la cookie refreshToken (HttpOnly) como evidencia de sesión.
  const refreshToken = req.cookies.get(REFRESH_TOKEN_COOKIE)?.value;
  const refreshSecret = process.env.JWT_REFRESH_SECRET;

  if (!refreshToken || !refreshSecret) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  try {
    const secret = new TextEncoder().encode(refreshSecret);
    const { payload } = await jwtVerify(refreshToken, secret);
    return propagateIdentity(req, payload);
  } catch {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }
}
