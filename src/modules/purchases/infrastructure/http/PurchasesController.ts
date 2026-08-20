import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseListQuery } from "@/shared/infrastructure/http/parseListQuery";
import { ListPurchasesUseCase } from "../../application/use-cases/ListPurchasesUseCase";
import { GetPurchaseUseCase } from "../../application/use-cases/GetPurchaseUseCase";
import { CreatePurchaseUseCase } from "../../application/use-cases/CreatePurchaseUseCase";
import { CancelPurchaseUseCase } from "../../application/use-cases/CancelPurchaseUseCase";
import { RegisterProviderPaymentUseCase } from "../../application/use-cases/RegisterProviderPaymentUseCase";
import { CancelProviderPaymentUseCase } from "../../application/use-cases/CancelProviderPaymentUseCase";
import { GetProviderPaymentUseCase } from "../../application/use-cases/GetProviderPaymentUseCase";
import { ListProviderPaymentsByPurchaseUseCase } from "../../application/use-cases/ListProviderPaymentsByPurchaseUseCase";
import { PurchaseNotFoundError } from "../../domain/errors/PurchaseNotFoundError";
import { PurchaseAlreadyCancelledError } from "../../domain/errors/PurchaseAlreadyCancelledError";
import { PurchaseHasActiveProviderPaymentsError } from "../../domain/errors/PurchaseHasActiveProviderPaymentsError";
import { PurchaseItemsEmptyError } from "../../domain/errors/PurchaseItemsEmptyError";
import { PurchaseNotPayableError } from "../../domain/errors/PurchaseNotPayableError";
import { ProviderPaymentExceedsDueAmountError } from "../../domain/errors/ProviderPaymentExceedsDueAmountError";
import { ProviderPaymentNotFoundError } from "../../domain/errors/ProviderPaymentNotFoundError";
import { ProviderPaymentAlreadyCancelledError } from "../../domain/errors/ProviderPaymentAlreadyCancelledError";
import { ProviderNotFoundOrInactiveError } from "../../domain/errors/ProviderNotFoundOrInactiveError";
import { ProductNotFoundOrInactiveError } from "../../domain/errors/ProductNotFoundOrInactiveError";
import { SatUuidAlreadyExistsError } from "../../domain/errors/SatUuidAlreadyExistsError";
import { InactiveResourceError } from "@/modules/pos/domain/errors/InactiveResourceError";
import {
  enforceBranchScope,
  resolveScopedBranchId,
} from "@/modules/rbac/infrastructure/http/enforceBranchScope";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";
import { PurchaseStatus } from "../../domain/value-objects/PurchaseStatus";

const uuidSchema = z.string().uuid("Invalid ID format");

const STATUS_VALUES: PurchaseStatus[] = ["completed", "cancelled"];

const listQueryFiltersSchema = z.object({
  branchId: z.string().uuid().optional(),
  providerId: z.string().uuid().optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const purchaseItemSchema = z
  .object({
    productId: z.string().uuid(),
    quantity: z.number().positive("quantity must be > 0"),
    unitCost: z.number().min(0, "unitCost must be >= 0"),
    discountPct: z.number().min(0).max(100).nullable().optional(),
    lotNumber: z.string().trim().min(1).max(64).nullable().optional(),
    expirationDate: z.coerce.date().nullable().optional(),
    manufactureDate: z.coerce.date().nullable().optional(),
  })
  .refine((item) => Boolean(item.lotNumber) === Boolean(item.expirationDate), {
    message: "lotNumber and expirationDate must be provided together",
    path: ["lotNumber"],
  });

const newProviderSchema = z
  .object({
    rfc: z.string().trim().regex(/^([A-ZÑ&]{3,4}\d{6}[A-Z\d]{3})$/, "RFC inválido").toUpperCase(),
    name: z.string().trim().min(2).max(255),
    legalName: z.string().trim().max(255).nullable().optional(),
    taxRegime: z.string().trim().regex(/^\d{3}$/, "taxRegime debe ser 3 dígitos").nullable().optional(),
  })
  .strict();

const createPurchaseSchema = z
  .object({
    providerId: z.string().uuid().optional(),
    newProvider: newProviderSchema.nullable().optional(),
    branchId: z.string().uuid(),
    paymentMethodId: z.string().uuid(),
    notes: z.string().max(1000).nullable().optional(),
    purchasedAt: z.coerce.date().optional(),
    satUuid: z.string().uuid().nullable().optional(),
    supplierInvoiceNumber: z.string().max(60).trim().nullable().optional(),
    invoiceDate: z.coerce.date().nullable().optional(),
    xmlFileName: z.string().max(255).trim().nullable().optional(),
    items: z.array(purchaseItemSchema).min(1, "Purchase must include at least one item"),
  })
  .strict()
  .refine((body) => Boolean(body.providerId) !== Boolean(body.newProvider), {
    message: "Provide exactly one of providerId or newProvider",
    path: ["providerId"],
  });

const cancelPurchaseSchema = z.object({
  reason: z.string().trim().min(3).max(500).nullable().optional(),
});

const registerProviderPaymentSchema = z.object({
  amount: z.number().positive("amount must be > 0"),
  notes: z.string().max(1000).nullable().optional(),
});

const cancelProviderPaymentSchema = z.object({
  reason: z.string().trim().min(3).max(500).nullable().optional(),
});

export class PurchasesController {
  constructor(
    private readonly listUseCase: ListPurchasesUseCase,
    private readonly getUseCase: GetPurchaseUseCase,
    private readonly createUseCase: CreatePurchaseUseCase,
    private readonly cancelUseCase: CancelPurchaseUseCase,
    private readonly registerProviderPaymentUseCase: RegisterProviderPaymentUseCase,
    private readonly cancelProviderPaymentUseCase: CancelProviderPaymentUseCase,
    private readonly getProviderPaymentUseCase: GetProviderPaymentUseCase,
    private readonly listProviderPaymentsByPurchaseUseCase: ListProviderPaymentsByPurchaseUseCase,
    private readonly authzService: AuthorizationService
  ) {}

  async list(req: NextRequest): Promise<NextResponse> {
    const { searchParams } = new URL(req.url);
    const parsed = parseListQuery(searchParams);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const filtersParsed = listQueryFiltersSchema.safeParse({
      branchId: searchParams.get("branchId") ?? undefined,
      providerId: searchParams.get("providerId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    if (!filtersParsed.success) {
      return NextResponse.json({ error: filtersParsed.error.errors[0].message }, { status: 400 });
    }

    const scoped = await resolveScopedBranchId(req, filtersParsed.data.branchId, this.authzService);
    if (scoped instanceof NextResponse) return scoped;

    const statuses = filtersParsed.data.status
      ? filtersParsed.data.status
          .split(",")
          .map((s) => s.trim())
          .filter((s): s is PurchaseStatus => (STATUS_VALUES as string[]).includes(s))
      : undefined;

    const result = await this.listUseCase.execute({
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      branchId: scoped.branchId,
      providerId: filtersParsed.data.providerId,
      statuses,
      from: filtersParsed.data.from ? new Date(filtersParsed.data.from) : undefined,
      to: filtersParsed.data.to ? new Date(filtersParsed.data.to) : undefined,
    });
    return NextResponse.json(result);
  }

  async getById(req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }
    try {
      const { dto, branchId } = await this.getUseCase.execute(idParsed.data);
      const scope = await enforceBranchScope(req, branchId, this.authzService);
      if (scope) return scope;
      return NextResponse.json(dto);
    } catch (err) {
      if (err instanceof PurchaseNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      throw err;
    }
  }

  async create(req: NextRequest): Promise<NextResponse> {
    const body = await req.json().catch(() => ({}));
    const parsed = createPurchaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const scope = await enforceBranchScope(req, parsed.data.branchId, this.authzService);
    if (scope) return scope;

    const creatorId = req.headers.get("x-user-id") ?? "";
    try {
      const { dto } = await this.createUseCase.execute({
        providerId: parsed.data.providerId,
        newProvider: parsed.data.newProvider,
        branchId: parsed.data.branchId,
        paymentMethodId: parsed.data.paymentMethodId,
        notes: parsed.data.notes ?? null,
        creatorId,
        purchasedAt: parsed.data.purchasedAt,
        satUuid: parsed.data.satUuid,
        supplierInvoiceNumber: parsed.data.supplierInvoiceNumber,
        invoiceDate: parsed.data.invoiceDate,
        xmlFileName: parsed.data.xmlFileName,
        items: parsed.data.items,
      });
      return NextResponse.json(dto, { status: 201 });
    } catch (err) {
      if (err instanceof PurchaseItemsEmptyError) return NextResponse.json({ error: err.message }, { status: 400 });
      if (err instanceof ProviderNotFoundOrInactiveError) return NextResponse.json({ error: err.message }, { status: 400 });
      if (err instanceof ProductNotFoundOrInactiveError) return NextResponse.json({ error: err.message }, { status: 400 });
      if (err instanceof InactiveResourceError) return NextResponse.json({ error: err.message }, { status: 400 });
      if (err instanceof SatUuidAlreadyExistsError) return NextResponse.json({ error: err.message, existingPurchaseFolio: err.existingPurchaseFolio }, { status: 409 });
      throw err;
    }
  }

  async cancel(req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const parsed = cancelPurchaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const existing = await this.getUseCase.execute(idParsed.data).catch((err) => {
      if (err instanceof PurchaseNotFoundError) return null;
      throw err;
    });
    if (!existing) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });

    const scope = await enforceBranchScope(req, existing.branchId, this.authzService);
    if (scope) return scope;

    const cancelledBy = req.headers.get("x-user-id") ?? "";
    try {
      const { dto } = await this.cancelUseCase.execute({
        id: idParsed.data,
        cancelledBy,
        cancellationReason: parsed.data.reason ?? null,
      });
      return NextResponse.json(dto);
    } catch (err) {
      if (err instanceof PurchaseNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      if (err instanceof PurchaseAlreadyCancelledError) return NextResponse.json({ error: err.message }, { status: 409 });
      if (err instanceof PurchaseHasActiveProviderPaymentsError) {
        return NextResponse.json({ error: err.message, providerPaymentIds: err.providerPaymentIds }, { status: 409 });
      }
      throw err;
    }
  }

  async registerProviderPayment(req: NextRequest, purchaseId: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(purchaseId);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const parsed = registerProviderPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const existing = await this.getUseCase.execute(idParsed.data).catch((err) => {
      if (err instanceof PurchaseNotFoundError) return null;
      throw err;
    });
    if (!existing) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });

    const scope = await enforceBranchScope(req, existing.branchId, this.authzService);
    if (scope) return scope;

    const creatorId = req.headers.get("x-user-id") ?? "";
    try {
      const { dto } = await this.registerProviderPaymentUseCase.execute({
        purchaseId: idParsed.data,
        amount: parsed.data.amount,
        notes: parsed.data.notes ?? null,
        creatorId,
      });
      return NextResponse.json(dto, { status: 201 });
    } catch (err) {
      if (err instanceof PurchaseNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      if (err instanceof PurchaseNotPayableError) return NextResponse.json({ error: err.message }, { status: 409 });
      if (err instanceof ProviderPaymentExceedsDueAmountError) {
        return NextResponse.json({ error: err.message, due: err.due }, { status: 409 });
      }
      throw err;
    }
  }

  async listProviderPaymentsByPurchase(req: NextRequest, purchaseId: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(purchaseId);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }

    const existing = await this.getUseCase.execute(idParsed.data).catch((err) => {
      if (err instanceof PurchaseNotFoundError) return null;
      throw err;
    });
    if (!existing) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });

    const scope = await enforceBranchScope(req, existing.branchId, this.authzService);
    if (scope) return scope;

    const items = await this.listProviderPaymentsByPurchaseUseCase.execute(idParsed.data);
    return NextResponse.json({ items });
  }

  async cancelProviderPayment(req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const parsed = cancelProviderPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const existing = await this.getProviderPaymentUseCase.execute(idParsed.data).catch((err) => {
      if (err instanceof ProviderPaymentNotFoundError) return null;
      throw err;
    });
    if (!existing) return NextResponse.json({ error: "Provider payment not found" }, { status: 404 });

    const scope = await enforceBranchScope(req, existing.branchId, this.authzService);
    if (scope) return scope;

    const cancelledBy = req.headers.get("x-user-id") ?? "";
    try {
      const { dto } = await this.cancelProviderPaymentUseCase.execute({
        id: idParsed.data,
        cancelledBy,
        cancellationReason: parsed.data.reason ?? null,
      });
      return NextResponse.json(dto);
    } catch (err) {
      if (err instanceof ProviderPaymentNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      if (err instanceof ProviderPaymentAlreadyCancelledError) return NextResponse.json({ error: err.message }, { status: 409 });
      throw err;
    }
  }
}
