import { NextRequest } from "next/server";
import { authMiddleware } from "@/modules/auth/infrastructure/middleware/AuthMiddlewareAdapter";

export function middleware(req: NextRequest) {
  return authMiddleware(req);  // returns Promise<NextResponse>, Next.js handles it
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
