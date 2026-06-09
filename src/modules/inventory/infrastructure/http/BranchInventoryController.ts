import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ListBranchInventoryUseCase } from "../../application/use-cases/ListBranchInventoryUseCase";
import { GetBranchInventoryItemUseCase } from "../../application/use-cases/GetBranchInventoryItemUseCase";
import { CreateBranchInventoryItemUseCase } from "../../application/use-cases/CreateBranchInventoryItemUseCase";
import { UpdateBranchInventoryItemUseCase } from "../../application/use-cases/UpdateBranchInventoryItemUseCase";
import { AdjustStockUseCase } from "../../application/use-cases/AdjustStockUseCase";
import { DeleteBranchInventoryItemUseCase } from "../../application/use-cases/DeleteBranchInventoryItemUseCase";
import { BranchInventoryRecordNotFoundError } from "../../domain/errors/BranchInventoryRecordNotFoundError";
import { BranchInventoryAlreadyExistsError } from "../../domain/errors/BranchInventoryAlreadyExistsError";
import { NegativeStockNotAllowedError } from "../../domain/errors/NegativeStockNotAllowedError";
import { InventoryBranchNotFoundError } from "../../domain/errors/InventoryBranchNotFoundError";
import { InventoryProductNotAvailableError } from "../../domain/errors/InventoryProductNotAvailableError";
import { enforceBranchScope } from "@/modules/rbac/infrastructure/http/enforceBranchScope";

const branchIdSchema = z.string().uuid("Invalid branch ID format");
const productIdSchema = z.string().uuid("Invalid product ID format");

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100, "pageSize must not exceed 100").default(20),
  search: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined)
    .pipe(z.string().min(2, "search must be at least 2 characters").optional()),
  belowReorder: z.string().optional().transform((v) => v === "true"),
});

const createBodySchema = z.object({
  productId: z.string().uuid("productId must be a valid UUID"),
  quantity: z.number().min(0, "quantity must be >= 0").optional(),
  reservedQuantity: z.number().min(0, "reservedQuantity must be >= 0").optional(),
  reorderPoint: z.number().min(0, "reorderPoint must be >= 0").optional(),
});

const updateBodySchema = z
  .object({
    quantity: z.number().min(0, "quantity must be >= 0").optional(),
    reservedQuantity: z.number().min(0, "reservedQuantity must be >= 0").optional(),
    reorderPoint: z.number().min(0, "reorderPoint must be >= 0").optional(),
  })
  .refine((d) => d.quantity !== undefined || d.reservedQuantity !== undefined || d.reorderPoint !== undefined, {
    message: "At least one field must be provided",
  });

const adjustBodySchema = z.object({
  delta: z.number({ invalid_type_error: "delta must be a number" }),
  reason: z.string().max(200).optional(),
});

export class BranchInventoryController {
  constructor(
    private readonly listUseCase: ListBranchInventoryUseCase,
    private readonly getUseCase: GetBranchInventoryItemUseCase,
    private readonly createUseCase: CreateBranchInventoryItemUseCase,
    private readonly updateUseCase: UpdateBranchInventoryItemUseCase,
    private readonly adjustUseCase: AdjustStockUseCase,
    private readonly deleteUseCase: DeleteBranchInventoryItemUseCase
  ) {}

  async list(req: NextRequest, branchId: string): Promise<NextResponse> {
    const idParsed = branchIdSchema.safeParse(branchId);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }
    const scope = await enforceBranchScope(req, idParsed.data);
    if (scope) return scope;
    const { searchParams } = new URL(req.url);
    const parsed = listQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      belowReorder: searchParams.get("belowReorder") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    try {
      const result = await this.listUseCase.execute({ branchId: idParsed.data, ...parsed.data });
      return NextResponse.json(result);
    } catch (err) {
      if (err instanceof InventoryBranchNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      throw err;
    }
  }

  async getById(req: NextRequest, branchId: string, productId: string): Promise<NextResponse> {
    const validation = this.parseIds(branchId, productId);
    if (validation) return validation;
    const scope = await enforceBranchScope(req, branchId);
    if (scope) return scope;
    try {
      const dto = await this.getUseCase.execute(branchId, productId);
      return NextResponse.json(dto);
    } catch (err) {
      if (err instanceof BranchInventoryRecordNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      throw err;
    }
  }

  async create(req: NextRequest, branchId: string): Promise<NextResponse> {
    const idParsed = branchIdSchema.safeParse(branchId);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const parsed = createBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const scope = await enforceBranchScope(req, idParsed.data);
    if (scope) return scope;
    try {
      const dto = await this.createUseCase.execute(idParsed.data, parsed.data);
      return NextResponse.json(dto, { status: 201 });
    } catch (err) {
      if (err instanceof InventoryBranchNotFoundError) return NextResponse.json({ error: err.message }, { status: 400 });
      if (err instanceof InventoryProductNotAvailableError) return NextResponse.json({ error: err.message }, { status: 400 });
      if (err instanceof BranchInventoryAlreadyExistsError) return NextResponse.json({ error: err.message }, { status: 409 });
      throw err;
    }
  }

  async update(req: NextRequest, branchId: string, productId: string): Promise<NextResponse> {
    const validation = this.parseIds(branchId, productId);
    if (validation) return validation;
    const body = await req.json().catch(() => ({}));
    const parsed = updateBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const scope = await enforceBranchScope(req, branchId);
    if (scope) return scope;
    try {
      const dto = await this.updateUseCase.execute(branchId, productId, parsed.data);
      return NextResponse.json(dto);
    } catch (err) {
      if (err instanceof BranchInventoryRecordNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      throw err;
    }
  }

  async adjust(req: NextRequest, branchId: string, productId: string): Promise<NextResponse> {
    const validation = this.parseIds(branchId, productId);
    if (validation) return validation;
    const body = await req.json().catch(() => ({}));
    const parsed = adjustBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const scope = await enforceBranchScope(req, branchId);
    if (scope) return scope;
    try {
      const dto = await this.adjustUseCase.execute(branchId, productId, parsed.data);
      return NextResponse.json(dto);
    } catch (err) {
      if (err instanceof BranchInventoryRecordNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      if (err instanceof NegativeStockNotAllowedError) return NextResponse.json({ error: err.message }, { status: 409 });
      throw err;
    }
  }

  async delete(req: NextRequest, branchId: string, productId: string): Promise<NextResponse> {
    const validation = this.parseIds(branchId, productId);
    if (validation) return validation;
    const scope = await enforceBranchScope(req, branchId);
    if (scope) return scope;
    try {
      await this.deleteUseCase.execute(branchId, productId);
      return new NextResponse(null, { status: 204 });
    } catch (err) {
      if (err instanceof BranchInventoryRecordNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      throw err;
    }
  }

  private parseIds(branchId: string, productId: string): NextResponse | null {
    const branchParsed = branchIdSchema.safeParse(branchId);
    if (!branchParsed.success) {
      return NextResponse.json({ error: branchParsed.error.errors[0].message }, { status: 400 });
    }
    const productParsed = productIdSchema.safeParse(productId);
    if (!productParsed.success) {
      return NextResponse.json({ error: productParsed.error.errors[0].message }, { status: 400 });
    }
    return null;
  }
}
