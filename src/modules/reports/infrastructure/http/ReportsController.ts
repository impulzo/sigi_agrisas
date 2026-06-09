import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { GetInventoryStockReportUseCase } from "../../application/use-cases/GetInventoryStockReportUseCase";
import { GetPaymentHistoryReportUseCase } from "../../application/use-cases/GetPaymentHistoryReportUseCase";
import { InventoryStockReportPdf } from "../pdf/InventoryStockReportPdf";
import { PaymentHistoryReportPdf } from "../pdf/PaymentHistoryReportPdf";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { resolveScopedBranchId } from "@/modules/rbac/infrastructure/http/enforceBranchScope";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";

const formatEnum = z.enum(["json", "pdf"], {
  errorMap: () => ({ message: "Invalid format. Allowed: json, pdf" }),
}).default("json");

const stockQuerySchema = z.object({
  branchId: z.string().uuid("Invalid branchId").optional(),
  departmentId: z.string().uuid("Invalid departmentId").optional(),
  includeZeroStock: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined) return true;
      if (v === "true") return true;
      if (v === "false") return false;
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid includeZeroStock" });
      return z.NEVER;
    }),
  format: formatEnum,
});

const paymentQuerySchema = z.object({
  branchId: z.string().uuid("Invalid branchId").optional(),
  customerId: z.string().uuid("Invalid customerId").optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid startDate")
    .transform((v) => new Date(`${v}T00:00:00.000Z`))
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid endDate")
    .transform((v) => new Date(`${v}T00:00:00.000Z`))
    .optional(),
  format: formatEnum,
});

export class ReportsController {
  constructor(
    private readonly stockUseCase: GetInventoryStockReportUseCase,
    private readonly paymentUseCase: GetPaymentHistoryReportUseCase,
    private readonly authzService: AuthorizationService
  ) {}

  async getInventoryStockReport(req: NextRequest): Promise<NextResponse> {
    const authError = await requirePermission(req, "reports:inventory_read", this.authzService);
    if (authError) return authError;

    const params = Object.fromEntries(new URL(req.url).searchParams.entries());
    const parsed = stockQuerySchema.safeParse(params);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json({ error: issue.message }, { status: 400 });
    }

    const { branchId, departmentId, includeZeroStock, format } = parsed.data;

    const scopeResult = await resolveScopedBranchId(req, branchId, this.authzService);
    if (scopeResult instanceof NextResponse) return scopeResult;

    const userId = req.headers.get("x-user-id")!;
    const email = req.headers.get("x-user-email") ?? "";

    try {
      const dto = await this.stockUseCase.execute({
        branchId: scopeResult.branchId ?? null,
        departmentId: departmentId ?? null,
        includeZeroStock,
        generatedBy: { userId, email },
      });

      if (format === "pdf") {
        const buffer = await renderToBuffer(createElement(InventoryStockReportPdf, { data: dto }) as never);
        const date = dto.generatedAt.split("T")[0];
        return new NextResponse(buffer as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="stock-${date}.pdf"`,
          },
        });
      }

      return NextResponse.json(dto);
    } catch (err) {
      console.error("[ReportsController] getInventoryStockReport error", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  async getPaymentHistoryReport(req: NextRequest): Promise<NextResponse> {
    const authError = await requirePermission(req, "payments:report_read", this.authzService);
    if (authError) return authError;

    const params = Object.fromEntries(new URL(req.url).searchParams.entries());
    const parsed = paymentQuerySchema.safeParse(params);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json({ error: issue.message }, { status: 400 });
    }

    const { branchId, customerId, startDate, endDate, format } = parsed.data;

    const scopeResult = await resolveScopedBranchId(req, branchId, this.authzService);
    if (scopeResult instanceof NextResponse) return scopeResult;

    const userId = req.headers.get("x-user-id")!;
    const email = req.headers.get("x-user-email") ?? "";

    try {
      const dto = await this.paymentUseCase.execute({
        branchId: scopeResult.branchId ?? null,
        customerId: customerId ?? null,
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        generatedBy: { userId, email },
      });

      if (format === "pdf") {
        const buffer = await renderToBuffer(
          createElement(PaymentHistoryReportPdf, { data: dto }) as never
        );
        const date = dto.generatedAt.split("T")[0];
        return new NextResponse(buffer as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="payments-${date}.pdf"`,
          },
        });
      }

      return NextResponse.json(dto);
    } catch (err) {
      console.error("[ReportsController] getPaymentHistoryReport error", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }
}
