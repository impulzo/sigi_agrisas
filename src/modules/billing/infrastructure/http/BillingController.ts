import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoiceDocumentPdf } from "../pdf/InvoiceDocumentPdf";
import { GetTicketSettingsUseCase } from "@/modules/settings/application/use-cases/GetTicketSettingsUseCase";
import { StampInvoiceUseCase } from "../../application/use-cases/StampInvoiceUseCase";
import { CancelInvoiceUseCase } from "../../application/use-cases/CancelInvoiceUseCase";
import { DownloadInvoiceFileUseCase } from "../../application/use-cases/DownloadInvoiceFileUseCase";
import { SendInvoiceEmailUseCase } from "../../application/use-cases/SendInvoiceEmailUseCase";
import { ListInvoicesUseCase } from "../../application/use-cases/ListInvoicesUseCase";
import { GetInvoiceUseCase } from "../../application/use-cases/GetInvoiceUseCase";
import { ListInvoicesBySaleUseCase } from "../../application/use-cases/ListInvoicesBySaleUseCase";
import { UploadCsdUseCase } from "../../application/use-cases/UploadCsdUseCase";
import { GetCsdStatusUseCase } from "../../application/use-cases/GetCsdStatusUseCase";
import { GetEmitterFiscalSettingsUseCase } from "../../application/use-cases/GetEmitterFiscalSettingsUseCase";
import { SearchSatTaxRegimesUseCase } from "@/modules/sat-codes/application/use-cases/SearchSatTaxRegimesUseCase";
import { SearchSatCfdiUsesUseCase } from "@/modules/sat-codes/application/use-cases/SearchSatCfdiUsesUseCase";
import { resolveSatDescription } from "../services/resolveSatDescription";
import { BillingLookupService } from "../../application/ports/BillingLookupService";
import { toInvoiceDto } from "../../application/mappers/toInvoiceDto";
import {
  InvoiceNotFoundError,
  SaleNotInvoiceableError,
  SaleAlreadyInvoicedError,
  ReceiverFiscalDataIncompleteError,
  InvoiceAlreadyCancelledError,
  FacturamaStampError,
  FacturamaCancelError,
  FacturamaCsdError,
  BranchScopeViolationError,
  InvoiceNoEmailError,
  InvoiceNotStampedError,
  InvoiceEmailSendFailedError,
  InvoiceFileDownloadFailedError,
} from "../../domain/errors";
import { isValidCancellationMotive } from "../../domain/value-objects/CancellationMotive";
import {
  requirePermission,
} from "@/modules/rbac/infrastructure/http/requirePermission";
import {
  enforceBranchScope,
  resolveScopedBranchId,
} from "@/modules/rbac/infrastructure/http/enforceBranchScope";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";

const uuidSchema = z.string().uuid("Invalid ID format");

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  branchId: z.string().uuid().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
});

const standaloneItemSchema = z.object({
  productId: z.string().uuid().nullable().optional(),
  productCode: z.string().min(1).max(32),
  description: z.string().min(1).max(200),
  satProductCode: z.string().regex(/^\d{8}$/).nullable().optional(),
  satUnitCode: z.string().max(10).nullable().optional(),
  unit: z.string().max(60).optional(),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
  discountPct: z.number().min(0).max(100).nullable().optional(),
  ivaRate: z.number().min(0).max(1).nullable().optional(),
  iepsRate: z.number().min(0).max(1).nullable().optional(),
});

const stampFromSaleSchema = z.object({
  saleId: z.string().uuid(),
  paymentForm: z.string().max(4).optional(),
  paymentMethod: z.string().max(4).optional(),
  cfdiUse: z.string().max(8).optional(),
});

const stampStandaloneSchema = z.object({
  branchId: z.string().uuid().nullable().optional(),
  customer: z.object({
    rfc: z.string().min(12).max(13),
    name: z.string().min(1).max(200),
    cfdiUse: z.string().min(1).max(8),
    fiscalRegime: z.string().min(3).max(3),
    taxZipCode: z.string().regex(/^\d{5}$/),
  }),
  items: z.array(standaloneItemSchema).min(1),
  paymentForm: z.string().max(4).optional(),
  paymentMethod: z.string().max(4).optional(),
});

const sendEmailSchema = z.object({
  email: z.string().email().optional(),
});

const cancelSchema = z.object({
  motive: z.enum(["01", "02", "03", "04"]),
  uuidReplacement: z.string().max(40).nullable().optional(),
});

const previewLineSchema = z.object({
  description: z.string().min(1),
  productCode: z.string().min(1),
  satProductCode: z.string().nullable().optional(),
  quantity: z.number(),
  unitPrice: z.number(),
  discountPct: z.number(),
  ivaRate: z.number(),
  iepsRate: z.number(),
  lineSubtotal: z.number(),
  lineTotal: z.number(),
});

const previewPdfSchema = z.object({
  issuer: z.object({
    name: z.string().min(1),
    branchName: z.string().nullable().optional(),
  }),
  receiver: z.object({
    rfc: z.string(),
    name: z.string().min(1),
    cfdiUse: z.string(),
    fiscalRegime: z.string(),
    taxZipCode: z.string(),
  }),
  lines: z.array(previewLineSchema).min(1),
  paymentForm: z.string(),
  paymentMethod: z.string(),
  subtotal: z.number(),
  taxTotal: z.number(),
  total: z.number(),
  currency: z.string(),
});

const csdSchema = z.object({
  rfc: z.string().min(12).max(13),
  certificateBase64: z.string().min(1),
  privateKeyBase64: z.string().min(1),
  privateKeyPassword: z.string().min(1),
  legalName: z.string().max(200).optional(),
  fiscalRegime: z.string().regex(/^\d{3}$/, "Invalid fiscal regime format").optional(),
  zipCode: z.string().regex(/^\d{5}$/, "Invalid zip code format").optional(),
  address: z.string().max(500).optional(),
});

export class BillingController {
  constructor(
    private readonly stampUseCase: StampInvoiceUseCase,
    private readonly cancelUseCase: CancelInvoiceUseCase,
    private readonly downloadUseCase: DownloadInvoiceFileUseCase,
    private readonly listUseCase: ListInvoicesUseCase,
    private readonly getUseCase: GetInvoiceUseCase,
    private readonly listBySaleUseCase: ListInvoicesBySaleUseCase,
    private readonly uploadCsdUseCase: UploadCsdUseCase,
    private readonly getCsdStatusUseCase: GetCsdStatusUseCase,
    private readonly authz: AuthorizationService,
    private readonly lookupService: BillingLookupService,
    private readonly sendEmailUseCase: SendInvoiceEmailUseCase,
    private readonly getTicketSettingsUseCase: GetTicketSettingsUseCase,
    private readonly getEmitterFiscalSettingsUseCase: GetEmitterFiscalSettingsUseCase,
    private readonly searchSatTaxRegimesUseCase: SearchSatTaxRegimesUseCase,
    private readonly searchSatCfdiUsesUseCase: SearchSatCfdiUsesUseCase
  ) {}

  async list(req: NextRequest): Promise<NextResponse> {
    const authError = await requirePermission(req, "billing:read", this.authz);
    if (authError) return authError;

    const params = Object.fromEntries(new URL(req.url).searchParams.entries());
    const parsed = listQuerySchema.safeParse(params);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const scoped = await resolveScopedBranchId(req, parsed.data.branchId, this.authz);
    if (scoped instanceof NextResponse) return scoped;

    const result = await this.listUseCase.execute({
      branchId: scoped.branchId,
      status: parsed.data.status,
      search: parsed.data.search,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });
    return NextResponse.json({
      items: result.items.map(toInvoiceDto),
      total: result.total,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });
  }

  async stamp(req: NextRequest): Promise<NextResponse> {
    const authError = await requirePermission(req, "billing:write", this.authz);
    if (authError) return authError;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    const bodyObj = body as Record<string, unknown>;

    if (bodyObj.saleId) {
      const parsed = stampFromSaleSchema.safeParse(bodyObj);
      if (!parsed.success) {
        return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
      }
      const scoped = await resolveScopedBranchId(req, undefined, this.authz);
      if (scoped instanceof NextResponse) return scoped;
      try {
        const invoice = await this.stampUseCase.execute(
          { type: "sale", ...parsed.data },
          userId,
          scoped.branchId ?? ""
        );
        return NextResponse.json(toInvoiceDto(invoice), { status: 201 });
      } catch (err) {
        return this.handleStampError(err);
      }
    }

    const parsed = stampStandaloneSchema.safeParse(bodyObj);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const scoped = await resolveScopedBranchId(req, parsed.data.branchId ?? undefined, this.authz);
    if (scoped instanceof NextResponse) return scoped;

    let resolvedBranchId = scoped.branchId;
    if (!resolvedBranchId) {
      const hq = await this.lookupService.findHeadquarters();
      if (!hq) {
        return NextResponse.json({ error: "BranchRequired" }, { status: 400 });
      }
      resolvedBranchId = hq.id;
    }

    try {
      const invoice = await this.stampUseCase.execute(
        { type: "standalone", ...parsed.data },
        userId,
        resolvedBranchId
      );
      return NextResponse.json(toInvoiceDto(invoice), { status: 201 });
    } catch (err) {
      return this.handleStampError(err);
    }
  }

  private handleStampError(err: unknown): NextResponse {
    if (err instanceof SaleNotInvoiceableError) {
      return NextResponse.json({ error: "SaleNotInvoiceable" }, { status: 409 });
    }
    if (err instanceof SaleAlreadyInvoicedError) {
      return NextResponse.json({ error: "SaleAlreadyInvoiced", invoiceId: err.invoiceId }, { status: 409 });
    }
    if (err instanceof ReceiverFiscalDataIncompleteError) {
      return NextResponse.json({ error: "ReceiverFiscalDataIncomplete", missingFields: err.missingFields }, { status: 400 });
    }
    if (err instanceof FacturamaStampError) {
      return NextResponse.json({ error: "FacturamaStampError", detail: err.detail }, { status: 422 });
    }
    if (err instanceof BranchScopeViolationError) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    throw err;
  }

  async getById(req: NextRequest, id: string): Promise<NextResponse> {
    const authError = await requirePermission(req, "billing:read", this.authz);
    if (authError) return authError;

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    try {
      const invoice = await this.getUseCase.execute(id);
      const scopeError = await enforceBranchScope(req, invoice.branchId, this.authz);
      if (scopeError) return scopeError;

      const [issuerFiscalRegimeLabel, receiverFiscalRegimeLabel, receiverCfdiUseLabel] = await Promise.all([
        invoice.issuerFiscalRegime
          ? resolveSatDescription(this.searchSatTaxRegimesUseCase, invoice.issuerFiscalRegime)
          : null,
        resolveSatDescription(this.searchSatTaxRegimesUseCase, invoice.receiverFiscalRegime),
        resolveSatDescription(this.searchSatCfdiUsesUseCase, invoice.receiverCfdiUse),
      ]);

      return NextResponse.json({
        ...toInvoiceDto(invoice),
        issuerFiscalRegimeLabel,
        receiverFiscalRegimeLabel,
        receiverCfdiUseLabel,
      });
    } catch (err) {
      if (err instanceof InvoiceNotFoundError) {
        return NextResponse.json({ error: "InvoiceNotFound" }, { status: 404 });
      }
      throw err;
    }
  }

  async cancel(req: NextRequest, id: string): Promise<NextResponse> {
    const authError = await requirePermission(req, "billing:cancel", this.authz);
    if (authError) return authError;

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = cancelSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    try {
      const existing = await this.getUseCase.execute(id);
      const scopeError = await enforceBranchScope(req, existing.branchId, this.authz);
      if (scopeError) return scopeError;

      const invoice = await this.cancelUseCase.execute(
        id,
        parsed.data.motive,
        userId,
        parsed.data.uuidReplacement
      );
      return NextResponse.json(toInvoiceDto(invoice));
    } catch (err) {
      if (err instanceof InvoiceNotFoundError) {
        return NextResponse.json({ error: "InvoiceNotFound" }, { status: 404 });
      }
      if (err instanceof InvoiceAlreadyCancelledError) {
        return NextResponse.json({ error: "InvoiceAlreadyCancelled" }, { status: 409 });
      }
      if (err instanceof FacturamaCancelError) {
        return NextResponse.json({ error: "FacturamaCancelError", detail: err.detail }, { status: 422 });
      }
      throw err;
    }
  }

  async download(req: NextRequest, id: string): Promise<NextResponse> {
    const authError = await requirePermission(req, "billing:read", this.authz);
    if (authError) return authError;

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    const formatRaw = new URL(req.url).searchParams.get("format") ?? "pdf";
    if (formatRaw !== "pdf" && formatRaw !== "xml") {
      return NextResponse.json({ error: "format must be pdf or xml" }, { status: 400 });
    }
    const format = formatRaw as "pdf" | "xml";

    try {
      const invoice = await this.getUseCase.execute(id);
      const scopeError = await enforceBranchScope(req, invoice.branchId, this.authz);
      if (scopeError) return scopeError;

      const result = await this.downloadUseCase.execute(id, format);
      const buffer = Buffer.from(result.contentBase64, "base64");
      return new NextResponse(buffer, {
        headers: {
          "Content-Type": result.contentType,
          "Content-Disposition": `attachment; filename="${result.filename}"`,
          "Content-Length": String(buffer.length),
        },
      });
    } catch (err) {
      if (err instanceof InvoiceNotFoundError) {
        return NextResponse.json({ error: "InvoiceNotFound" }, { status: 404 });
      }
      if (err instanceof InvoiceNotStampedError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      if (err instanceof InvoiceFileDownloadFailedError) {
        return NextResponse.json({ error: err.message }, { status: 502 });
      }
      throw err;
    }
  }

  async sendEmail(req: NextRequest, id: string): Promise<NextResponse> {
    const authError = await requirePermission(req, "billing:read", this.authz);
    if (authError) return authError;

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    let body: unknown = {};
    try {
      const raw = await req.text();
      if (raw) body = JSON.parse(raw);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = sendEmailSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    try {
      const invoice = await this.getUseCase.execute(id);
      const scopeError = await enforceBranchScope(req, invoice.branchId, this.authz);
      if (scopeError) return scopeError;

      const result = await this.sendEmailUseCase.execute(id, parsed.data.email);
      return NextResponse.json(result, { status: 200 });
    } catch (err) {
      if (err instanceof InvoiceNotFoundError) {
        return NextResponse.json({ error: "InvoiceNotFound" }, { status: 404 });
      }
      if (err instanceof InvoiceNoEmailError || err instanceof InvoiceNotStampedError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      if (err instanceof InvoiceEmailSendFailedError) {
        return NextResponse.json({ error: err.message }, { status: 502 });
      }
      throw err;
    }
  }

  async listBySale(req: NextRequest, saleId: string): Promise<NextResponse> {
    const authError = await requirePermission(req, "billing:read", this.authz);
    if (authError) return authError;

    const idParsed = uuidSchema.safeParse(saleId);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Invalid sale ID format" }, { status: 400 });
    }

    const sale = await this.lookupService.findSaleWithItems(saleId);
    if (!sale) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const scopeError = await enforceBranchScope(req, sale.branchId, this.authz);
    if (scopeError) return scopeError;

    const invoices = await this.listBySaleUseCase.execute(saleId);
    return NextResponse.json({ items: invoices.map(toInvoiceDto) });
  }

  async previewPdf(req: NextRequest): Promise<NextResponse> {
    const authError = await requirePermission(req, "billing:write", this.authz);
    if (authError) return authError;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = previewPdfSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    try {
      const [{ logoUrl }, emitter] = await Promise.all([
        this.getTicketSettingsUseCase.execute(),
        this.getEmitterFiscalSettingsUseCase.execute(),
      ]);
      const [issuerFiscalRegimeLabel, receiverFiscalRegimeLabel, receiverCfdiUseLabel] = await Promise.all([
        resolveSatDescription(this.searchSatTaxRegimesUseCase, emitter.fiscalRegime),
        resolveSatDescription(this.searchSatTaxRegimesUseCase, parsed.data.receiver.fiscalRegime),
        resolveSatDescription(this.searchSatCfdiUsesUseCase, parsed.data.receiver.cfdiUse),
      ]);
      const rendered = await renderToBuffer(
        createElement(InvoiceDocumentPdf, {
          data: {
            ...parsed.data,
            issuer: {
              name: parsed.data.issuer.name,
              branchName: parsed.data.issuer.branchName,
              logoUrl,
              rfc: emitter.rfc,
              fiscalRegime: emitter.fiscalRegime,
              fiscalRegimeLabel: issuerFiscalRegimeLabel,
              zipCode: emitter.zipCode,
              address: emitter.address,
            },
            receiver: {
              ...parsed.data.receiver,
              fiscalRegimeLabel: receiverFiscalRegimeLabel,
              cfdiUseLabel: receiverCfdiUseLabel,
            },
          },
          watermark: "BORRADOR — no válido fiscalmente",
          folioLabel: "PENDIENTE DE TIMBRAR",
          isDraft: true,
        }) as never
      );
      const buffer = Buffer.from(rendered);

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="factura-borrador.pdf"`,
          "Content-Length": String(buffer.length),
        },
      });
    } catch {
      return NextResponse.json({ error: "PdfRenderError" }, { status: 500 });
    }
  }

  async uploadCsd(req: NextRequest): Promise<NextResponse> {
    const authError = await requirePermission(req, "billing:manage_csd", this.authz);
    if (authError) return authError;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = csdSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    try {
      const status = await this.uploadCsdUseCase.execute(parsed.data);
      return NextResponse.json(status);
    } catch (err) {
      if (err instanceof FacturamaCsdError) {
        return NextResponse.json({ error: "FacturamaCsdError", detail: err.detail }, { status: 422 });
      }
      throw err;
    }
  }

  async getCsdStatus(req: NextRequest): Promise<NextResponse> {
    const authError = await requirePermission(req, "billing:manage_csd", this.authz);
    if (authError) return authError;

    const rfc = new URL(req.url).searchParams.get("rfc") ?? undefined;
    try {
      const status = await this.getCsdStatusUseCase.execute(rfc);
      return NextResponse.json(status);
    } catch (err) {
      if (err instanceof FacturamaCsdError) {
        return NextResponse.json({ error: "FacturamaCsdError", detail: err.detail }, { status: 422 });
      }
      throw err;
    }
  }

  async getEmitterFiscalSettings(req: NextRequest): Promise<NextResponse> {
    const authError = await requirePermission(req, "billing:write", this.authz);
    if (authError) return authError;

    const settings = await this.getEmitterFiscalSettingsUseCase.execute();
    return NextResponse.json(settings);
  }
}
