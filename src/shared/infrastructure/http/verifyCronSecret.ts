import { NextRequest, NextResponse } from "next/server";

export function verifyCronSecret(req: NextRequest): NextResponse | null {
  const expected = process.env.CRON_SECRET;
  const provided = req.headers.get("authorization");

  if (!expected || provided !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
