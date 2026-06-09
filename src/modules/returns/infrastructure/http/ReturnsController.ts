import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ListReturnsUseCase } from "../../application/use-cases/ListReturnsUseCase";
import { GetReturnUseCase } from "../../application/use-cases/GetReturnUseCase";
import { ListReturnsBySaleUseCase } from "../../application/use-cases/ListReturnsBySaleUseCase";
import { CreateReturnUseCase } from "../../application/use-cases/CreateReturnUseCase";
import { CancelReturnUseCase } from "../../application/use-cases/CancelReturnUseCase";
import { ReturnNotFoundError } from "../../domain/errors/ReturnNotFoundError";
import { ReturnAlreadyCancelledError } from "../../domain/errors/ReturnAlreadyCancelledError";
import { SaleNotReturnableError } from "../../domain/errors/SaleNotReturnableError";
import { EmptyReturnError } from "../../domain/errors/EmptyReturnError";
import { ReturnQuantityExceedsRemainingError } from "../../domain/errors/ReturnQuantityExceedsRemainingError";
import { SaleItemNotPartOfSaleError } from "../../domain/errors/SaleItemNotPartOfSaleError";
import {
  enforceBranchScope,
  resolveScopedBranchId,
} from "@/modules/rbac/infrastructure/http/enforceBranchScope";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";
import { SaleRepository } from "@/modules/pos/application/ports/SaleRepository";
import { ReturnStatus } from "../../domain/value-objects/ReturnStatus";

const uuidSchema = z.string().uuid("Invalid ID format");

const STATUS_VALUES: ReturnStatus[] = ["completed", "cancelled"];

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100, "pageSize must not exceed 100").default(20),
  branchId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  saleId: z.string().uuid().optional(),
  status: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  search: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined)
    .pipe(z.string().min(2, "search must be at least 2 characters").optional()),
});

const returnItemInputSchema = z.object({
  saleItemId: z.string().uuid("saleItemId must be a valid UUID"),
  quantity: z.number().positive("quantity must be > 0"),
});

const createReturnSchema = z.object({
  saleId: z.string().uuid("saleId must be a valid UUID"),
  reason: z.string().trim().min(3, "reason must be at least 3 characters").max(500),
  returnedAt: z
    .string()
    .refine((v) => !isNaN(Date.parse(v)), "returnedAt must be a valid ISO 8601 date")
    .refine(
      (v) => new Date(v) <= new Date(),
      "returnedAt must not be in the future"
    ),
  notes: z.string().max(1000).nullable().optional(),
  items: z.array(returnItemInputSchema).min(1, "items must include at least one item"),
});

const cancelReturnSchema = z.object({
  reason: z.string().max(500).nullable().optional(),
});

export class ReturnsController {
  constructor(
    private readonly listUseCase: ListReturnsUseCase,
    private readonly getUseCase: GetReturnUseCase,
    private readonly listBySaleUseCase: ListReturnsBySaleUseCase,
    private readonly createUseCase: CreateReturnUseCase,
    private readonly cancelUseCase: CancelReturnUseCase,
    private readonly saleRepo: SaleRepository,
    private readonly authzService: AuthorizationService
  ) {}

  async list(req: NextRequest): Promise<NextResponse> {
    const { searchParams } = new URL(req.url);
    const parsed = listQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      branchId: searchParams.get("branchId") ?? undefined,
      customerId: searchParams.get("customerId") ?? undefined,
      saleId: searchParams.get("saleId") ?? undefined,
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

    const statuses = parsed.data.status
      ? parsed.data.status
          .split(",")
          .map((s) => s.trim())
          .filter((s): s is ReturnStatus => (STATUS_VALUES as string[]).includes(s))
      : undefined;

    const result = await this.listUseCase.execute({
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
      branchId: scoped.branchId,
      customerId: parsed.data.customerId,
      saleId: parsed.data.saleId,
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
      const dto = await this.getUseCase.execute(idParsed.data);
      const scope = await enforceBranchScope(req, dto.branchId, this.authzService);
      if (scope) return scope;
      return NextResponse.json(dto);
    } catch (err) {
      if (err instanceof ReturnNotFoundError) {
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

    // Load sale to extract branchId for scoping
    const saleSummary = await this.saleRepo.findByIdWithItems(idParsed.data);
    if (!saleSummary) {
      return NextResponse.json({ error: "Sale not found" }, { status: 404 });
    }

    const scope = await enforceBranchScope(req, saleSummary.sale.branchId, this.authzService);
    if (scope) return scope;

    const dtos = await this.listBySaleUseCase.execute(idParsed.data);
    return NextResponse.json({ returns: dtos });
  }

  async create(req: NextRequest): Promise<NextResponse> {
    const body = await req.json().catch(() => ({}));
    const parsed = createReturnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    // Load sale first to extract branchId for scoping
    const saleSummary = await this.saleRepo.findByIdWithItems(parsed.data.saleId);
    if (!saleSummary) {
      return NextResponse.json({ error: "Sale not found" }, { status: 400 });
    }

    const scope = await enforceBranchScope(req, saleSummary.sale.branchId, this.authzService);
    if (scope) return scope;

    const creatorId = req.headers.get("x-user-id") ?? "";
    try {
      const dto = await this.createUseCase.execute({
        saleId: parsed.data.saleId,
        creatorId,
        reason: parsed.data.reason,
        returnedAt: new Date(parsed.data.returnedAt),
        notes: parsed.data.notes ?? null,
        items: parsed.data.items,
      });
      return NextResponse.json(dto, { status: 201 });
    } catch (err) {
      if (err instanceof EmptyReturnError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      if (err instanceof SaleNotReturnableError) {
        return NextResponse.json({ error: err.message, status: err.saleStatus }, { status: 409 });
      }
      if (err instanceof SaleItemNotPartOfSaleError) {
        return NextResponse.json({ error: err.message, saleItemId: err.saleItemId }, { status: 400 });
      }
      if (err instanceof ReturnQuantityExceedsRemainingError) {
        return NextResponse.json(
          {
            error: err.message,
            saleItemId: err.saleItemId,
            requested: err.requested,
            remaining: err.remaining,
          },
          { status: 409 }
        );
      }
      if (err instanceof Error && err.message === "Sale not found") {
        return NextResponse.json({ error: "Sale not found" }, { status: 400 });
      }
      throw err;
    }
  }

  async cancel(req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const parsed = cancelReturnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }

    // Load return first to extract branchId for scoping
    const result = await this.getUseCase.execute(idParsed.data).catch((err) => {
      if (err instanceof ReturnNotFoundError) return null;
      throw err;
    });
    if (!result) {
      return NextResponse.json({ error: "Return not found" }, { status: 404 });
    }

    const scope = await enforceBranchScope(req, result.branchId, this.authzService);
    if (scope) return scope;

    const cancelledBy = req.headers.get("x-user-id") ?? "";
    try {
      const dto = await this.cancelUseCase.execute({
        id: idParsed.data,
        cancelledBy,
        cancellationReason: parsed.data.reason ?? null,
      });
      return NextResponse.json(dto);
    } catch (err) {
      if (err instanceof ReturnNotFoundError) {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
      if (err instanceof ReturnAlreadyCancelledError) {
        return NextResponse.json({ error: err.message }, { status: 409 });
      }
      throw err;
    }
  }
}
