import { NextResponse } from "next/server";

export function pdfResponse(buffer: Buffer, filename: string): NextResponse {
  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export function xlsxResponse(buffer: Buffer, filename: string): NextResponse {
  return new NextResponse(buffer as unknown as BodyInit, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

export function reportErrorResponse(label: string, err: unknown): NextResponse {
  console.error(`[ReportsController] ${label} error`, err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
