import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ListQuotesUseCase } from "../../application/use-cases/ListQuotesUseCase";
import { GetQuoteUseCase } from "../../application/use-cases/GetQuoteUseCase";
import { CreateQuoteUseCase } from "../../application/use-cases/CreateQuoteUseCase";
import { UpdateQuoteUseCase } from "../../application/use-cases/UpdateQuoteUseCase";
import { AuthorizeQuoteUseCase } from "../../application/use-cases/AuthorizeQuoteUseCase";
import { CancelQuoteUseCase } from "../../application/use-cases/CancelQuoteUseCase";
import { ConvertQuoteToSaleUseCase } from "../../application/use-cases/ConvertQuoteToSaleUseCase";
import { QuoteNotFoundError } from "../../domain/errors/QuoteNotFoundError";
import { QuoteNotEditableError } from "../../domain/errors/QuoteNotEditableError";
import { QuoteAlreadyAuthorizedError } from "../../domain/errors/QuoteAlreadyAuthorizedError";
import { QuoteNotAuthorizedError } from "../../domain/errors/QuoteNotAuthorizedError";
import { QuoteAlreadyConvertedError } from "../../domain/errors/QuoteAlreadyConvertedError";
import { QuoteAlreadyCancelledError } from "../../domain/errors/QuoteAlreadyCancelledError";
import { QuoteExpiredError } from "../../domain/errors/QuoteExpiredError";
import { EmptyQuoteError } from "../../domain/errors/EmptyQuoteError";
import { ProductPriceMismatchError } from "../../domain/errors/ProductPriceMismatchError";
import { InactiveResourceError } from "../../domain/errors/InactiveResourceError";
import { QUOTE_STATUSES, QuoteStatus, isQuoteStatus } from "../../domain/value-objects/QuoteStatus";
import {
  enforceBranchScope,
  resolveScopedBranchId,
} from "@/modules/rbac/infrastructure/http/enforceBranchScope";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";

const uuidSchema = z.string().uuid("Invalid quote ID format");

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100, "pageSize must not exceed 100").default(20),
  branchId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined)
    .pipe(z.string().min(2, "search must be at least 2 characters").optional()),
});

const quoteItemSchema = z.object({
  productId: z.string().uuid(),
  productPriceId: z.string().uuid(),
  quantity: z.number().positive("quantity must be > 0"),
});

const futureIsoDate = z
  .string()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), "expiresAt must be a valid ISO 8601 date")
  .refine((v) => new Date(v) > new Date(), "expiresAt must be in the future");

const createQuoteSchema = z.object({
  branchId: z.string().uuid(),
  customerId: z.string().uuid().nullable().optional(),
  folioId: z.string().uuid(),
  notes: z.string().max(1000).nullable().optional(),
  expiresAt: futureIsoDate.nullable().optional(),
  items: z.array(quoteItemSchema).min(1, "Quote must include at least one item"),
});

const updateQuoteSchema = z
  .object({
    items: z.array(quoteItemSchema).min(1, "Quote must include at least one item").optional(),
    notes: z.string().max(1000).nullable().optional(),
    expiresAt: futureIsoDate.nullable().optional(),
  })
  .refine(
    (v) => v.items !== undefined || v.notes !== undefined || v.expiresAt !== undefined,
    "At least one updatable field must be provided"
  );

const authorizeQuoteSchema = z.object({
  notes: z.string().max(1000).nullable().optional(),
});

const cancelQuoteSchema = z.object({
  reason: z.string().max(500).nullable().optional(),
});

const convertQuoteSchema = z.object({
  paymentMethodId: z.string().uuid(),
  folioId: z.string().uuid(),
  notes: z.string().max(1000).nullable().optional(),
});

export class QuotesController {
  constructor(
    private readonly listUseCase: ListQuotesUseCase,
    private readonly getUseCase: GetQuoteUseCase,
    private readonly createUseCase: CreateQuoteUseCase,
    private readonly updateUseCase: UpdateQuoteUseCase,
    private readonly authorizeUseCase: AuthorizeQuoteUseCase,
    private readonly cancelUseCase: CancelQuoteUseCase,
    private readonly convertUseCase: ConvertQuoteToSaleUseCase,
    private readonly authzService: AuthorizationService
  ) {}

  async list(req: NextRequest): Promise<NextResponse> {
    const { searchParams } = new URL(req.url);
    const parsed = listQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      branchId: searchParams.get("branchId") ?? undefined,
      customerId: searchParams.get("customerId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    const scoped = await resolveScopedBranchId(req, parsed.data.branchId, this.authzService);
    if (scoped instanceof NextResponse) return scoped;

    const statuses: QuoteStatus[] | undefined = parsed.data.status
      ? parsed.data.status
          .split(",")
          .map((s) => s.trim())
          .filter(isQuoteStatus)
      : undefined;

    const result = await this.listUseCase.execute({
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      branchId: scoped.branchId,
      customerId: parsed.data.customerId,
      statuses,
      from: parsed.data.from ? new Date(parsed.data.from) : undefined,
      to: parsed.data.to ? new Date(parsed.data.to) : undefined,
      search: parsed.data.search,
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
      if (err instanceof QuoteNotFoundError) {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
      throw err;
    }
  }

  async create(req: NextRequest): Promise<NextResponse> {
    const body = await req.json().catch(() => ({}));
    const parsed = createQuoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const scope = await enforceBranchScope(req, parsed.data.branchId, this.authzService);
    if (scope) return scope;
    const creatorId = req.headers.get("x-user-id") ?? "";
    try {
      const { dto } = await this.createUseCase.execute(parsed.data, creatorId);
      return NextResponse.json(dto, { status: 201 });
    } catch (err) {
      return this.mapErrorToResponse(err);
    }
  }

  async update(req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const parsed = updateQuoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    try {
      const existing = await this.getUseCase.execute(idParsed.data);
      const scope = await enforceBranchScope(req, existing.branchId, this.authzService);
      if (scope) return scope;
      const { dto } = await this.updateUseCase.execute(idParsed.data, parsed.data);
      return NextResponse.json(dto);
    } catch (err) {
      return this.mapErrorToResponse(err);
    }
  }

  async authorize(req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const parsed = authorizeQuoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    try {
      const existing = await this.getUseCase.execute(idParsed.data);
      const scope = await enforceBranchScope(req, existing.branchId, this.authzService);
      if (scope) return scope;
      const userId = req.headers.get("x-user-id") ?? "";
      const { dto } = await this.authorizeUseCase.execute(idParsed.data, parsed.data, userId);
      return NextResponse.json(dto);
    } catch (err) {
      return this.mapErrorToResponse(err);
    }
  }

  async cancel(req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const parsed = cancelQuoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    try {
      const existing = await this.getUseCase.execute(idParsed.data);
      const scope = await enforceBranchScope(req, existing.branchId, this.authzService);
      if (scope) return scope;
      const { dto } = await this.cancelUseCase.execute(idParsed.data, parsed.data);
      return NextResponse.json(dto);
    } catch (err) {
      return this.mapErrorToResponse(err);
    }
  }

  async convert(req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const parsed = convertQuoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    try {
      const existing = await this.getUseCase.execute(idParsed.data);
      const scope = await enforceBranchScope(req, existing.branchId, this.authzService);
      if (scope) return scope;
      const cashierId = req.headers.get("x-user-id") ?? "";
      const { dto } = await this.convertUseCase.execute(idParsed.data, parsed.data, cashierId);
      return NextResponse.json(dto);
    } catch (err) {
      return this.mapErrorToResponse(err);
    }
  }

  private mapErrorToResponse(err: unknown): NextResponse {
    if (err instanceof QuoteNotFoundError) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    if (err instanceof QuoteNotEditableError) {
      return NextResponse.json(
        { error: err.message, status: err.status },
        { status: 409 }
      );
    }
    if (err instanceof QuoteAlreadyAuthorizedError) {
      return NextResponse.json(
        { error: err.message, status: err.status },
        { status: 409 }
      );
    }
    if (err instanceof QuoteNotAuthorizedError) {
      return NextResponse.json(
        { error: err.message, status: err.status },
        { status: 409 }
      );
    }
    if (err instanceof QuoteAlreadyConvertedError) {
      return NextResponse.json(
        { error: err.message, saleId: err.saleId },
        { status: 409 }
      );
    }
    if (err instanceof QuoteAlreadyCancelledError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof QuoteExpiredError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof EmptyQuoteError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof ProductPriceMismatchError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof InactiveResourceError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    if (err instanceof Error && err.message === "expiresAt must be in the future") {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    throw err;
  }
}

// Exported for testing / introspection
export { QUOTE_STATUSES };
