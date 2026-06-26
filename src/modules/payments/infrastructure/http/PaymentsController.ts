import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { renderToBuffer } from "@react-pdf/renderer";
import React from "react";
import { RegisterPaymentUseCase } from "../../application/use-cases/RegisterPaymentUseCase";
import { CancelPaymentUseCase } from "../../application/use-cases/CancelPaymentUseCase";
import { ListPaymentsUseCase } from "../../application/use-cases/ListPaymentsUseCase";
import { GetPaymentUseCase } from "../../application/use-cases/GetPaymentUseCase";
import { ListPaymentsBySaleUseCase } from "../../application/use-cases/ListPaymentsBySaleUseCase";
import { GetPaymentHistoryReportUseCase } from "../../application/use-cases/GetPaymentHistoryReportUseCase";
import { toPaymentDto, toPaymentDetailDto } from "../../application/mappers/toPaymentDto";
import { PaymentHistoryReportDto, PaymentHistoryRowDto } from "../../application/dto/PaymentDto";
import { PaymentNotFoundError } from "../../domain/errors/PaymentNotFoundError";
import { PaymentAlreadyCancelledError } from "../../domain/errors/PaymentAlreadyCancelledError";
import { PaymentExceedsDueAmountError } from "../../domain/errors/PaymentExceedsDueAmountError";
import { SaleNotPayableError } from "../../domain/errors/SaleNotPayableError";
import { PaymentHistoryPdf } from "../pdf/PaymentHistoryPdf";
import {
  requirePermission,
} from "@/modules/rbac/infrastructure/http/requirePermission";
import {
  enforceBranchScope,
  resolveScopedBranchId,
} from "@/modules/rbac/infrastructure/http/enforceBranchScope";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";
import { PaymentHistoryItem } from "../../application/ports/PaymentRepository";
import { BranchScopeViolationError } from "../../domain/errors/BranchScopeViolationError";
import { FolioScopeMismatchError } from "@/shared/domain/errors/FolioScopeMismatchError";
import { InactiveResourceError } from "@/modules/pos/domain/errors/InactiveResourceError";

const uuidSchema = z.string().uuid("Invalid ID format");

const registerSchema = z.object({
  saleId: z.string().uuid(),
  paymentMethodId: z.string().uuid(),
  folioId: z.string().uuid(),
  amount: z.number().positive("amount must be > 0"),
  notes: z.string().max(1000).nullable().optional(),
});

const cancelSchema = z.object({
  reason: z.string().max(500).nullable().optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  branchId: z.string().uuid().optional(),
  saleId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  paymentMethodId: z.string().uuid().optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const historyQuerySchema = z.object({
  format: z.enum(["json", "pdf"]).default("json"),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
  branchId: z.string().uuid().optional(),
  saleId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  productId: z.string().uuid().optional(),
  paymentMethodId: z.string().uuid().optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export class PaymentsController {
  constructor(
    private readonly registerUseCase: RegisterPaymentUseCase,
    private readonly cancelUseCase: CancelPaymentUseCase,
    private readonly listUseCase: ListPaymentsUseCase,
    private readonly getUseCase: GetPaymentUseCase,
    private readonly listBySaleUseCase: ListPaymentsBySaleUseCase,
    private readonly historyUseCase: GetPaymentHistoryReportUseCase,
    private readonly authzService: AuthorizationService
  ) {}

  async register(req: NextRequest): Promise<NextResponse> {
    const guard = await requirePermission(req, "payments:create", this.authzService);
    if (guard) return guard;

    const body = await req.json().catch(() => ({}));
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const userId = req.headers.get("x-user-id") ?? "";

    // Compute branch scope BEFORE the use case so the check runs inside the transaction
    const bypass = await this.authzService.userCan(userId, "branches:access_all");
    if (!bypass) {
      const userBranchId = req.headers.get("x-user-branch-id") ?? "";
      if (!userBranchId) {
        return NextResponse.json({ error: "Forbidden", required: "branches:access_all" }, { status: 403 });
      }
    }
    const callerBranchId = bypass ? null : (req.headers.get("x-user-branch-id") ?? "");

    try {
      const { dto } = await this.registerUseCase.execute({
        saleId: parsed.data.saleId,
        paymentMethodId: parsed.data.paymentMethodId,
        folioId: parsed.data.folioId,
        amount: parsed.data.amount,
        notes: parsed.data.notes,
        userId,
        callerBranchId,
      });

      return NextResponse.json(dto, { status: 201 });
    } catch (err) {
      if (err instanceof BranchScopeViolationError) {
        return NextResponse.json({ error: "Forbidden", required: "branches:access_all" }, { status: 403 });
      }
      if (err instanceof SaleNotPayableError) {
        const body: Record<string, string> = { error: "SaleNotPayable" };
        if (err.status) body.status = err.status;
        if (err.reason) body.reason = err.reason;
        return NextResponse.json(body, { status: 409 });
      }
      if (err instanceof PaymentExceedsDueAmountError) {
        return NextResponse.json({ error: "PaymentExceedsDueAmount", due: err.due }, { status: 409 });
      }
      if (err instanceof FolioScopeMismatchError) {
        return NextResponse.json(
          { error: "FolioScopeMismatch", expected: err.expected, actual: err.actual },
          { status: 400 }
        );
      }
      if (err instanceof InactiveResourceError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      if (err instanceof Error && err.message.includes("not found")) {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
      throw err;
    }
  }

  async cancel(req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }

    const guard = await requirePermission(req, "payments:cancel", this.authzService);
    if (guard) return guard;

    const body = await req.json().catch(() => ({}));
    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    try {
      // Get payment first for branch scoping
      const { data } = await this.getUseCase.execute(idParsed.data);
      const scope = await enforceBranchScope(req, data.payment.branchId, this.authzService);
      if (scope) return scope;

      const userId = req.headers.get("x-user-id") ?? "";
      const { dto } = await this.cancelUseCase.execute(idParsed.data, parsed.data.reason ?? null, userId);
      return NextResponse.json(dto);
    } catch (err) {
      if (err instanceof PaymentNotFoundError) {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
      if (err instanceof PaymentAlreadyCancelledError) {
        return NextResponse.json({ error: "PaymentAlreadyCancelled" }, { status: 409 });
      }
      throw err;
    }
  }

  async list(req: NextRequest): Promise<NextResponse> {
    const guard = await requirePermission(req, "payments:read", this.authzService);
    if (guard) return guard;

    const { searchParams } = new URL(req.url);
    const parsed = listQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      branchId: searchParams.get("branchId") ?? undefined,
      saleId: searchParams.get("saleId") ?? undefined,
      customerId: searchParams.get("customerId") ?? undefined,
      userId: searchParams.get("userId") ?? undefined,
      paymentMethodId: searchParams.get("paymentMethodId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const scoped = await resolveScopedBranchId(req, parsed.data.branchId, this.authzService);
    if (scoped instanceof NextResponse) return scoped;

    const statuses = parsed.data.status
      ? parsed.data.status.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const result = await this.listUseCase.execute(
      {
        branchId: scoped.branchId,
        saleId: parsed.data.saleId,
        customerId: parsed.data.customerId,
        userId: parsed.data.userId,
        paymentMethodId: parsed.data.paymentMethodId,
        statuses,
        from: parsed.data.from ? new Date(parsed.data.from) : undefined,
        to: parsed.data.to ? new Date(parsed.data.to) : undefined,
      },
      { page: parsed.data.page, pageSize: parsed.data.pageSize }
    );

    const items = result.items.map(({ payment: p, joins }) => ({
      id: p.id,
      saleId: p.saleId,
      saleFolioCode: joins.saleFolioCode,
      customerId: p.customerId,
      customerName: joins.customerName,
      userId: p.userId,
      userName: joins.userName,
      branchId: p.branchId,
      branchName: joins.branchName,
      paymentMethodId: p.paymentMethodId,
      paymentMethodCode: joins.paymentMethodCode,
      folioId: p.folioId,
      folioCode: p.folioCode,
      folioNumber: p.folioNumber,
      amount: p.amount.toFixed(4),
      status: p.status,
      notes: p.notes,
      createdAt: p.createdAt.toISOString(),
      cancelledAt: p.cancelledAt ? p.cancelledAt.toISOString() : null,
      cancellationReason: p.cancellationReason,
    }));

    return NextResponse.json({ items, total: result.total, page: result.page, pageSize: result.pageSize });
  }

  async getById(req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }

    const guard = await requirePermission(req, "payments:read", this.authzService);
    if (guard) return guard;

    try {
      const { data } = await this.getUseCase.execute(idParsed.data);
      const scope = await enforceBranchScope(req, data.payment.branchId, this.authzService);
      if (scope) return scope;

      const joined = {
        saleFolioCode: data.joins?.saleFolioCode ?? data.sale.folioCode,
        customerName: data.joins?.customerName ?? "",
        userName: data.joins?.userName ?? "",
        branchName: data.joins?.branchName ?? "",
        paymentMethodCode: data.joins?.paymentMethodCode ?? "",
      };

      return NextResponse.json(toPaymentDetailDto(data, joined));
    } catch (err) {
      if (err instanceof PaymentNotFoundError) {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
      throw err;
    }
  }

  async listBySale(req: NextRequest, saleId: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(saleId);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }

    const guard = await requirePermission(req, "payments:read", this.authzService);
    if (guard) return guard;

    try {
      const { result, branchId: saleBranchId } = await this.listBySaleUseCase.execute(idParsed.data);
      const scope = await enforceBranchScope(req, saleBranchId, this.authzService);
      if (scope) return scope;

      return NextResponse.json({
        items: result.items.map(({ payment: p, joins }) => ({
          id: p.id,
          saleId: p.saleId,
          saleFolioCode: joins.saleFolioCode,
          customerId: p.customerId,
          customerName: joins.customerName,
          userId: p.userId,
          userName: joins.userName,
          branchId: p.branchId,
          branchName: joins.branchName,
          paymentMethodId: p.paymentMethodId,
          paymentMethodCode: joins.paymentMethodCode,
          folioId: p.folioId,
          folioCode: p.folioCode,
          folioNumber: p.folioNumber,
          amount: p.amount.toFixed(4),
          status: p.status,
          notes: p.notes,
          createdAt: p.createdAt.toISOString(),
          cancelledAt: p.cancelledAt ? p.cancelledAt.toISOString() : null,
          cancellationReason: p.cancellationReason,
        })),
        saleId: result.saleId,
        saleTotal: result.saleTotal,
        salePaidAmount: result.salePaidAmount,
        salePaymentStatus: result.salePaymentStatus,
        saleDueAmount: result.saleDueAmount,
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes("not found")) {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
      throw err;
    }
  }

  async history(req: NextRequest): Promise<NextResponse> {
    const guard = await requirePermission(req, "payments:report_read", this.authzService);
    if (guard) return guard;

    const { searchParams } = new URL(req.url);
    const parsed = historyQuerySchema.safeParse({
      format: searchParams.get("format") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      branchId: searchParams.get("branchId") ?? undefined,
      saleId: searchParams.get("saleId") ?? undefined,
      customerId: searchParams.get("customerId") ?? undefined,
      userId: searchParams.get("userId") ?? undefined,
      productId: searchParams.get("productId") ?? undefined,
      paymentMethodId: searchParams.get("paymentMethodId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const scoped = await resolveScopedBranchId(req, parsed.data.branchId, this.authzService);
    if (scoped instanceof NextResponse) return scoped;

    const statuses = parsed.data.status
      ? parsed.data.status.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const userId = req.headers.get("x-user-id") ?? "";
    const userEmail = req.headers.get("x-user-email") ?? "";
    const forPdf = parsed.data.format === "pdf";

    const result = await this.historyUseCase.execute({
      filters: {
        branchId: scoped.branchId,
        saleId: parsed.data.saleId,
        customerId: parsed.data.customerId,
        userId: parsed.data.userId,
        productId: parsed.data.productId,
        paymentMethodId: parsed.data.paymentMethodId,
        statuses,
        from: parsed.data.from ? new Date(parsed.data.from) : undefined,
        to: parsed.data.to ? new Date(parsed.data.to) : undefined,
      },
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      forPdf,
    });

    if (forPdf) {
      if (result.tooLarge) {
        return NextResponse.json({ error: "ReportTooLarge", limit: 10000 }, { status: 409 });
      }

      const generatedAt = new Date().toISOString();
      const rows: PaymentHistoryRowDto[] = result.items.map((item: PaymentHistoryItem) => ({
        id: item.id,
        createdAt: item.createdAt.toISOString(),
        folioCode: item.folioCode,
        saleId: item.saleId,
        saleFolioCode: item.saleFolioCode,
        customerId: item.customerId,
        customerName: item.customerName,
        userId: item.userId,
        userName: item.userName,
        branchId: item.branchId,
        branchName: item.branchName,
        paymentMethodCode: item.paymentMethodCode,
        amount: item.amount.toFixed(4),
        status: item.status,
        cancelledAt: item.cancelledAt ? item.cancelledAt.toISOString() : null,
      }));

      const dto: PaymentHistoryReportDto = {
        generatedAt,
        generatedBy: { userId, email: userEmail },
        filters: {
          userId: parsed.data.userId ?? null,
          saleId: parsed.data.saleId ?? null,
          customerId: parsed.data.customerId ?? null,
          productId: parsed.data.productId ?? null,
          paymentMethodId: parsed.data.paymentMethodId ?? null,
          status: statuses ?? ["completed", "cancelled"],
          from: parsed.data.from ?? null,
          to: parsed.data.to ?? null,
          branchId: scoped.branchId ?? null,
        },
        items: rows,
        totals: {
          rowCount: result.total,
          completedCount: result.completedCount,
          cancelledCount: result.cancelledCount,
          totalAmountCompleted: result.totalAmountCompleted,
          totalAmountCancelled: result.totalAmountCancelled,
        },
        page: 1,
        pageSize: result.total,
        total: result.total,
      };

      const pdfBuffer = await renderToBuffer(React.createElement(PaymentHistoryPdf, { data: dto }) as never);
      const dateStr = generatedAt.substring(0, 10);

      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="payments-history-${dateStr}.pdf"`,
        },
      });
    }

    // JSON response
    const generatedAt = new Date().toISOString();
    const rows: PaymentHistoryRowDto[] = result.items.map((item: PaymentHistoryItem) => ({
      id: item.id,
      createdAt: item.createdAt.toISOString(),
      folioCode: item.folioCode,
      saleId: item.saleId,
      saleFolioCode: item.saleFolioCode,
      customerId: item.customerId,
      customerName: item.customerName,
      userId: item.userId,
      userName: item.userName,
      branchId: item.branchId,
      branchName: item.branchName,
      paymentMethodCode: item.paymentMethodCode,
      amount: item.amount.toFixed(4),
      status: item.status,
      cancelledAt: item.cancelledAt ? item.cancelledAt.toISOString() : null,
    }));

    const dto: PaymentHistoryReportDto = {
      generatedAt,
      generatedBy: { userId, email: userEmail },
      filters: {
        userId: parsed.data.userId ?? null,
        saleId: parsed.data.saleId ?? null,
        customerId: parsed.data.customerId ?? null,
        productId: parsed.data.productId ?? null,
        paymentMethodId: parsed.data.paymentMethodId ?? null,
        status: statuses ?? ["completed", "cancelled"],
        from: parsed.data.from ?? null,
        to: parsed.data.to ?? null,
        branchId: scoped.branchId ?? null,
      },
      items: rows,
      totals: {
        rowCount: result.total,
        completedCount: result.completedCount,
        cancelledCount: result.cancelledCount,
        totalAmountCompleted: result.totalAmountCompleted,
        totalAmountCancelled: result.totalAmountCancelled,
      },
      page: result.page,
      pageSize: result.pageSize,
      total: result.total,
    };

    return NextResponse.json(dto);
  }
}
