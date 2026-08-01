import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { GetInventoryStockReportUseCase } from "../../application/use-cases/GetInventoryStockReportUseCase";
import { GetPaymentHistoryReportUseCase } from "../../application/use-cases/GetPaymentHistoryReportUseCase";
import { GetAccountStatementsSummaryUseCase } from "../../application/use-cases/GetAccountStatementsSummaryUseCase";
import { GetAccountStatementLedgerUseCase } from "../../application/use-cases/GetAccountStatementLedgerUseCase";
import { GetAnticipoReceiptUseCase } from "../../application/use-cases/GetAnticipoReceiptUseCase";
import { GetSalesCutReportUseCase } from "../../application/use-cases/GetSalesCutReportUseCase";
import { GetCashCutReportUseCase } from "../../application/use-cases/GetCashCutReportUseCase";
import { StatementCustomerNotFoundError } from "../../domain/errors/StatementCustomerNotFoundError";
import { AnticipoReceiptNotFoundError } from "../../domain/errors/AnticipoReceiptNotFoundError";
import { InventoryStockReportPdf } from "../pdf/InventoryStockReportPdf";
import { PaymentHistoryReportPdf } from "../pdf/PaymentHistoryReportPdf";
import {
  AccountStatementSummaryPdf,
  AccountStatementLedgerPdf,
} from "../pdf/AccountStatementPdf";
import { AnticipoReceiptPdf } from "../pdf/AnticipoReceiptPdf";
import { SalesCutReportPdf } from "../pdf/SalesCutReportPdf";
import { CashCutReportPdf } from "../pdf/CashCutReportPdf";
import { buildCashCutWorkbook } from "../xlsx/buildCashCutWorkbook";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { resolveScopedBranchId } from "@/modules/rbac/infrastructure/http/enforceBranchScope";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";

const LEDGER_PDF_MAX_ROWS = 10000;

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

const dateOnly = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date")
  .transform((v) => new Date(`${v}T00:00:00.000Z`))
  .optional();

const uuidParamSchema = z.string().uuid("Invalid customerId");

const summaryQuerySchema = z.object({
  branchId: z.string().uuid("Invalid branchId").optional(),
  search: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined)
    .pipe(z.string().min(2, "search must be at least 2 characters").optional()),
  from: dateOnly,
  to: dateOnly,
  onlyWithBalance: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || v === "false") return false;
      if (v === "true") return true;
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid onlyWithBalance" });
      return z.NEVER;
    }),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100, "pageSize must not exceed 100").default(20),
  format: formatEnum,
});

const ledgerQuerySchema = z.object({
  branchId: z.string().uuid("Invalid branchId").optional(),
  from: dateOnly,
  to: dateOnly,
  history: z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || v === "true") return true;
      if (v === "false") return false;
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid history" });
      return z.NEVER;
    }),
  sort: z
    .enum(["date", "invoice", "serie"], {
      errorMap: () => ({ message: "Invalid sort. Allowed: date, invoice, serie" }),
    })
    .default("date"),
  format: formatEnum,
});

const receiptQuerySchema = z.object({
  format: z
    .enum(["pdf"], { errorMap: () => ({ message: "Invalid format. Allowed: pdf" }) })
    .default("pdf"),
});

const salesCutQuerySchema = z.object({
  preset: z.enum(["today"]).optional(),
  from: dateOnly,
  to: dateOnly,
  branchId: z.string().uuid("Invalid branchId").optional(),
  cashierId: z.string().uuid("Invalid cashierId").optional(),
  paymentMethodId: z.string().uuid("Invalid paymentMethodId").optional(),
  format: formatEnum,
});

const cashCutFormatEnum = z.enum(["json", "pdf", "xlsx"], {
  errorMap: () => ({ message: "Invalid format. Allowed: json, pdf, xlsx" }),
}).default("json");

const requiredDate = (label: string) =>
  z
    .string({ required_error: `${label} is required` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, `Invalid ${label}`)
    .transform((v) => new Date(`${v}T00:00:00.000Z`));

const cashCutQuerySchema = z.object({
  from: requiredDate("from"),
  to: requiredDate("to"),
  branchId: z.string().uuid("Invalid branchId").optional(),
  customerId: z.string().uuid("Invalid customerId").optional(),
  paymentMethodId: z.string().uuid("Invalid paymentMethodId").optional(),
  format: cashCutFormatEnum,
});

export class ReportsController {
  constructor(
    private readonly stockUseCase: GetInventoryStockReportUseCase,
    private readonly paymentUseCase: GetPaymentHistoryReportUseCase,
    private readonly accountSummaryUseCase: GetAccountStatementsSummaryUseCase,
    private readonly accountLedgerUseCase: GetAccountStatementLedgerUseCase,
    private readonly anticipoReceiptUseCase: GetAnticipoReceiptUseCase,
    private readonly salesCutUseCase: GetSalesCutReportUseCase,
    private readonly cashCutUseCase: GetCashCutReportUseCase,
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

  async getAccountStatementsSummary(req: NextRequest): Promise<NextResponse> {
    const authError = await requirePermission(req, "reports:account_statements_read", this.authzService);
    if (authError) return authError;

    const params = Object.fromEntries(new URL(req.url).searchParams.entries());
    const parsed = summaryQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { branchId, search, from, to, onlyWithBalance, page, pageSize, format } = parsed.data;

    const scopeResult = await resolveScopedBranchId(req, branchId, this.authzService);
    if (scopeResult instanceof NextResponse) return scopeResult;

    const userId = req.headers.get("x-user-id")!;
    const email = req.headers.get("x-user-email") ?? "";

    try {
      const dto = await this.accountSummaryUseCase.execute({
        branchId: scopeResult.branchId ?? null,
        search: search ?? null,
        from: from ?? null,
        to: to ?? null,
        onlyWithBalance,
        page,
        pageSize,
        generatedBy: { userId, email },
      });

      if (format === "pdf") {
        const buffer = await renderToBuffer(
          createElement(AccountStatementSummaryPdf, { data: dto }) as never
        );
        const date = dto.generatedAt.split("T")[0];
        return new NextResponse(buffer as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="account-statements-${date}.pdf"`,
          },
        });
      }

      return NextResponse.json(dto);
    } catch (err) {
      console.error("[ReportsController] getAccountStatementsSummary error", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  async getAccountStatementLedger(req: NextRequest, customerId: string): Promise<NextResponse> {
    const idParsed = uuidParamSchema.safeParse(customerId);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.issues[0].message }, { status: 400 });
    }

    const authError = await requirePermission(req, "reports:account_statements_read", this.authzService);
    if (authError) return authError;

    const params = Object.fromEntries(new URL(req.url).searchParams.entries());
    const parsed = ledgerQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { branchId, from, to, history, sort, format } = parsed.data;

    const scopeResult = await resolveScopedBranchId(req, branchId, this.authzService);
    if (scopeResult instanceof NextResponse) return scopeResult;

    const userId = req.headers.get("x-user-id")!;
    const email = req.headers.get("x-user-email") ?? "";

    try {
      const dto = await this.accountLedgerUseCase.execute({
        customerId: idParsed.data,
        branchId: scopeResult.branchId ?? null,
        from: from ?? null,
        to: to ?? null,
        history,
        sort,
        generatedBy: { userId, email },
      });

      if (format === "pdf") {
        if (dto.movements.length > LEDGER_PDF_MAX_ROWS) {
          return NextResponse.json(
            { error: "ReportTooLarge", limit: LEDGER_PDF_MAX_ROWS },
            { status: 409 }
          );
        }
        const buffer = await renderToBuffer(
          createElement(AccountStatementLedgerPdf, { data: dto }) as never
        );
        const date = dto.generatedAt.split("T")[0];
        return new NextResponse(buffer as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="account-statement-${dto.customer.code}-${date}.pdf"`,
          },
        });
      }

      return NextResponse.json(dto);
    } catch (err) {
      if (err instanceof StatementCustomerNotFoundError) {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
      console.error("[ReportsController] getAccountStatementLedger error", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  async getAnticipoReceipt(
    req: NextRequest,
    customerId: string,
    paymentId: string
  ): Promise<NextResponse> {
    const custParsed = uuidParamSchema.safeParse(customerId);
    if (!custParsed.success) {
      return NextResponse.json({ error: custParsed.error.issues[0].message }, { status: 400 });
    }
    const payParsed = z.string().uuid("Invalid paymentId").safeParse(paymentId);
    if (!payParsed.success) {
      return NextResponse.json({ error: payParsed.error.issues[0].message }, { status: 400 });
    }

    const authError = await requirePermission(req, "reports:account_statements_read", this.authzService);
    if (authError) return authError;

    const params = Object.fromEntries(new URL(req.url).searchParams.entries());
    const parsed = receiptQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const scopeResult = await resolveScopedBranchId(req, undefined, this.authzService);
    if (scopeResult instanceof NextResponse) return scopeResult;

    const userId = req.headers.get("x-user-id")!;
    const email = req.headers.get("x-user-email") ?? "";

    try {
      const dto = await this.anticipoReceiptUseCase.execute({
        customerId: custParsed.data,
        paymentId: payParsed.data,
        branchId: scopeResult.branchId ?? null,
        generatedBy: { userId, email },
      });

      const buffer = await renderToBuffer(
        createElement(AnticipoReceiptPdf, { data: dto }) as never
      );
      const date = dto.generatedAt.split("T")[0];
      return new NextResponse(buffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="anticipo-${dto.payment.folio}-${date}.pdf"`,
        },
      });
    } catch (err) {
      if (err instanceof AnticipoReceiptNotFoundError) {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
      console.error("[ReportsController] getAnticipoReceipt error", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  async getSalesCutReport(req: NextRequest): Promise<NextResponse> {
    const authError = await requirePermission(req, "reports:sales_cut_read", this.authzService);
    if (authError) return authError;

    const params = Object.fromEntries(new URL(req.url).searchParams.entries());
    const parsed = salesCutQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { preset, branchId, cashierId, paymentMethodId, format } = parsed.data;

    // Resolver periodo: preset "today" (o sin from/to) → día UTC actual.
    let from: Date;
    let to: Date;
    if (preset === "today" || (!parsed.data.from && !parsed.data.to)) {
      const todayStr = new Date().toISOString().split("T")[0];
      from = new Date(`${todayStr}T00:00:00.000Z`);
      to = new Date(`${todayStr}T00:00:00.000Z`);
    } else {
      const todayStr = new Date().toISOString().split("T")[0];
      from = parsed.data.from ?? new Date(`${todayStr}T00:00:00.000Z`);
      to = parsed.data.to ?? new Date(`${todayStr}T00:00:00.000Z`);
    }
    if (from > to) {
      return NextResponse.json({ error: "from must be <= to" }, { status: 400 });
    }

    const scopeResult = await resolveScopedBranchId(req, branchId, this.authzService);
    if (scopeResult instanceof NextResponse) return scopeResult;

    const userId = req.headers.get("x-user-id")!;
    const email = req.headers.get("x-user-email") ?? "";

    try {
      const dto = await this.salesCutUseCase.execute({
        branchId: scopeResult.branchId ?? null,
        cashierId: cashierId ?? null,
        paymentMethodId: paymentMethodId ?? null,
        from,
        to,
        generatedBy: { userId, email },
      });

      if (format === "pdf") {
        const buffer = await renderToBuffer(createElement(SalesCutReportPdf, { data: dto }) as never);
        return new NextResponse(buffer as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="sales-cut-${dto.filters.from}_${dto.filters.to}.pdf"`,
          },
        });
      }

      return NextResponse.json(dto);
    } catch (err) {
      console.error("[ReportsController] getSalesCutReport error", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  async getCashCutReport(req: NextRequest): Promise<NextResponse> {
    const authError = await requirePermission(req, "reports:cash_cut_read", this.authzService);
    if (authError) return authError;

    const params = Object.fromEntries(new URL(req.url).searchParams.entries());
    const parsed = cashCutQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
    }

    const { from, to, branchId, customerId, paymentMethodId, format } = parsed.data;
    if (from > to) {
      return NextResponse.json({ error: "from must be <= to" }, { status: 400 });
    }

    const scopeResult = await resolveScopedBranchId(req, branchId, this.authzService);
    if (scopeResult instanceof NextResponse) return scopeResult;

    const userId = req.headers.get("x-user-id")!;
    const email = req.headers.get("x-user-email") ?? "";

    try {
      const dto = await this.cashCutUseCase.execute({
        branchId: scopeResult.branchId ?? null,
        customerId: customerId ?? null,
        paymentMethodId: paymentMethodId ?? null,
        from,
        to,
        generatedBy: { userId, email },
      });

      if (format === "pdf") {
        const buffer = await renderToBuffer(createElement(CashCutReportPdf, { data: dto }) as never);
        return new NextResponse(buffer as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="cash-cut-${dto.filters.from}_${dto.filters.to}.pdf"`,
          },
        });
      }

      if (format === "xlsx") {
        const buffer = buildCashCutWorkbook(dto);
        return new NextResponse(buffer as unknown as BodyInit, {
          status: 200,
          headers: {
            "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": `attachment; filename="cash-cut-${dto.filters.from}_${dto.filters.to}.xlsx"`,
          },
        });
      }

      return NextResponse.json(dto);
    } catch (err) {
      console.error("[ReportsController] getCashCutReport error", err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }
}
