import { timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";

function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function verifyCronSecret(req: NextRequest): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization");

  if (!expected || !provided || !safeEquals(provided, `Bearer ${expected}`)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
