import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { GetKardexReportUseCase } from "../../application/use-cases/GetKardexReportUseCase";
import { RebuildInventoryArticleUseCase } from "../../application/use-cases/RebuildInventoryArticleUseCase";
import { ProductNotFoundError } from "@/modules/products/domain/errors/ProductNotFoundError";
import { InvalidKardexRangeError } from "../../domain/errors/InvalidKardexRangeError";
import { KardexReportPdf } from "../pdf/KardexReportPdf";
import { buildKardexWorkbook } from "../xlsx/buildKardexWorkbook";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { enforceBranchScope, resolveScopedBranchId } from "@/modules/rbac/infrastructure/http/enforceBranchScope";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";
import { GetTicketSettingsUseCase } from "@/modules/settings/application/use-cases/GetTicketSettingsUseCase";
import { toPdfIssuer } from "@/shared/infrastructure/pdf/pdfIssuer";

const MAX_MOVEMENTS = 10000;

const kardexQuerySchema = z.object({
  productId: z.string().uuid("productId must be a valid UUID"),
  branchId: z.string().uuid().optional(),
  from: z.string().min(1, "from is required"),
  to: z.string().min(1, "to is required"),
  format: z
    .enum(["json", "pdf", "xlsx"], { errorMap: () => ({ message: "Invalid format. Allowed: json, pdf, xlsx" }) })
    .default("json"),
});

const rebuildBodySchema = z.object({
  productId: z.string().uuid("productId must be a valid UUID"),
  branchId: z.string().uuid("branchId must be a valid UUID"),
});

/** Date-only strings (YYYY-MM-DD) are extended to the end of that day so `to` is inclusive. */
function parseRangeBound(value: string, endOfDay: boolean): Date | null {
  const isDateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(isDateOnly && endOfDay ? `${value}T23:59:59.999` : value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export class InventoryMovementsController {
  constructor(
    private readonly getKardexUseCase: GetKardexReportUseCase,
    private readonly rebuildUseCase: RebuildInventoryArticleUseCase,
    private readonly authzService: AuthorizationService,
    private readonly getTicketSettingsUseCase: GetTicketSettingsUseCase
  ) {}

  async getKardex(req: NextRequest): Promise<NextResponse> {
    const guard = await requirePermission(req, "inventory:kardex_read", this.authzService);
    if (guard) return guard;

    const { searchParams } = new URL(req.url);
    const parsed = kardexQuerySchema.safeParse({
      productId: searchParams.get("productId") ?? undefined,
      branchId: searchParams.get("branchId") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      format: searchParams.get("format") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const from = parseRangeBound(parsed.data.from, false);
    const to = parseRangeBound(parsed.data.to, true);
    if (!from || !to) {
      return NextResponse.json({ error: "from/to must be valid dates" }, { status: 400 });
    }

    const scoped = await resolveScopedBranchId(req, parsed.data.branchId, this.authzService);
    if (scoped instanceof NextResponse) return scoped;

    try {
      const report = await this.getKardexUseCase.execute({
        productId: parsed.data.productId,
        branchId: scoped.branchId ?? null,
        from,
        to,
      });

      if (report.movements.length > MAX_MOVEMENTS) {
        return NextResponse.json({ error: "ReportTooLarge", tooLarge: true }, { status: 409 });
      }

      if (parsed.data.format === "pdf") {
        const settings = await this.getTicketSettingsUseCase.execute();
        const issuer = toPdfIssuer(settings);
        const pdfBuffer = await renderToBuffer(
          React.createElement(KardexReportPdf, {
            data: report,
            from: parsed.data.from,
            to: parsed.data.to,
            issuer,
          }) as never
        );
        return new NextResponse(pdfBuffer as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="kardex-${report.product.code}-${parsed.data.from}_${parsed.data.to}.pdf"`,
          },
        });
      }

      if (parsed.data.format === "xlsx") {
        const workbook = buildKardexWorkbook(report);
        return new NextResponse(workbook as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="kardex-${report.product.code}-${parsed.data.from}_${parsed.data.to}.xlsx"`,
          },
        });
      }

      return NextResponse.json(report);
    } catch (err) {
      if (err instanceof ProductNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      if (err instanceof InvalidKardexRangeError) return NextResponse.json({ error: err.message }, { status: 400 });
      throw err;
    }
  }

  async rebuild(req: NextRequest): Promise<NextResponse> {
    const guard = await requirePermission(req, "inventory:write", this.authzService);
    if (guard) return guard;

    const body = await req.json().catch(() => ({}));
    const parsed = rebuildBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const scope = await enforceBranchScope(req, parsed.data.branchId, this.authzService);
    if (scope) return scope;

    const dto = await this.rebuildUseCase.execute(parsed.data.productId, parsed.data.branchId);
    return NextResponse.json(dto);
  }
}
