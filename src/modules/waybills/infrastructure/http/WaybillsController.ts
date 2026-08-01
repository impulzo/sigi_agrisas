import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CreateWaybillUseCase } from "../../application/use-cases/CreateWaybillUseCase";
import { CancelWaybillUseCase } from "../../application/use-cases/CancelWaybillUseCase";
import { ListWaybillsUseCase } from "../../application/use-cases/ListWaybillsUseCase";
import { GetWaybillUseCase } from "../../application/use-cases/GetWaybillUseCase";
import { DownloadWaybillFileUseCase } from "../../application/use-cases/DownloadWaybillFileUseCase";
import { toWaybillDto, toWaybillSummaryDto } from "../../application/mappers/toWaybillDto";
import {
  WaybillNotFoundError,
  InvalidBranchPairError,
  BranchAddressIncompleteError,
  InsufficientStockAtOriginError,
  WaybillAlreadyCancelledError,
  WaybillNotStampedError,
  FacturamaStampError,
  FacturamaCancelError,
  ProductRequiredForSimpleTransferError,
  ProductNotFoundForTransferError,
  CanonicalFolioMissingError,
} from "../../domain/errors";
import { WaybillStatus, isValidWaybillStatus } from "../../domain/value-objects/WaybillStatus";
import { WaybillType, isValidWaybillType } from "../../domain/value-objects/WaybillType";
import { requirePermission } from "@/modules/rbac/infrastructure/http/requirePermission";
import { resolveScopedBranchId } from "@/modules/rbac/infrastructure/http/enforceBranchScope";
import { AuthorizationService } from "@/modules/rbac/application/ports/AuthorizationService";

const uuidSchema = z.string().uuid("Invalid ID format");

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  branchId: z.string().uuid().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

const createSimpleItemSchema = z.object({
  productId: z.string().uuid(),
  description: z.string().min(1).max(200),
  quantity: z.number().positive(),
});

const createSimpleWaybillSchema = z
  .object({
    type: z.literal("simple"),
    originBranchId: z.string().uuid(),
    destinationBranchId: z.string().uuid(),
    transferDate: z.string().refine((v) => !isNaN(Date.parse(v)), "transferDate must be a valid ISO 8601 date"),
    notes: z.string().trim().max(500).nullable().optional(),
    items: z.array(createSimpleItemSchema).min(1),
  })
  .strict();

const createCartaPorteItemSchema = z
  .object({
    productId: z.string().uuid().nullable().optional(),
    description: z.string().min(1).max(200),
    satBienesTranspCode: z.string().min(1).max(8),
    satUnitCode: z.string().min(1).max(10),
    quantity: z.number().positive(),
    weightKg: z.number().positive(),
    isHazardousMaterial: z.boolean().optional(),
    hazardousMaterialCode: z.string().max(10).nullable().optional(),
  })
  .refine((d) => !d.isHazardousMaterial || !!d.hazardousMaterialCode, {
    message: "hazardousMaterialCode is required when isHazardousMaterial is true",
    path: ["hazardousMaterialCode"],
  });

const createCartaPorteWaybillSchema = z.object({
  type: z.literal("carta_porte"),
  originBranchId: z.string().uuid(),
  destinationBranchId: z.string().uuid(),
  vehicle: z.object({
    plate: z.string().min(1).max(20),
    config: z.string().min(1).max(10),
    permitType: z.string().min(1).max(10),
    permitNumber: z.string().min(1).max(50),
    insuranceCompany: z.string().min(1).max(150),
    insurancePolicy: z.string().min(1).max(50),
  }),
  driver: z.object({
    name: z.string().min(1).max(150),
    rfc: z.string().max(13).nullable().optional(),
    licenseNumber: z.string().min(1).max(50),
  }),
  distanceKm: z.number().positive(),
  departureAt: z.string().refine((v) => !isNaN(Date.parse(v)), "departureAt must be a valid ISO 8601 date"),
  arrivalAt: z.string().refine((v) => !isNaN(Date.parse(v)), "arrivalAt must be a valid ISO 8601 date"),
  items: z.array(createCartaPorteItemSchema).min(1),
});

const createWaybillSchema = z
  .discriminatedUnion("type", [createSimpleWaybillSchema, createCartaPorteWaybillSchema])
  .superRefine((d, ctx) => {
    if (d.type === "carta_porte" && new Date(d.arrivalAt) <= new Date(d.departureAt)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "arrivalAt must be after departureAt",
        path: ["arrivalAt"],
      });
    }
  });

const cancelSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

async function enforceEitherBranchScope(
  req: NextRequest,
  originBranchId: string,
  destinationBranchId: string,
  authz: AuthorizationService
): Promise<NextResponse | null> {
  const userId = req.headers.get("x-user-id") ?? "";
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const bypass = await authz.userCan(userId, "branches:access_all");
  if (bypass) return null;

  const userBranchId = req.headers.get("x-user-branch-id") ?? "";
  if (userBranchId === "" || (userBranchId !== originBranchId && userBranchId !== destinationBranchId)) {
    return NextResponse.json({ error: "Forbidden", required: "branches:access_all" }, { status: 403 });
  }
  return null;
}

export class WaybillsController {
  constructor(
    private readonly createUseCase: CreateWaybillUseCase,
    private readonly cancelUseCase: CancelWaybillUseCase,
    private readonly listUseCase: ListWaybillsUseCase,
    private readonly getUseCase: GetWaybillUseCase,
    private readonly downloadUseCase: DownloadWaybillFileUseCase,
    private readonly authz: AuthorizationService
  ) {}

  async list(req: NextRequest): Promise<NextResponse> {
    const authError = await requirePermission(req, "waybills:read", this.authz);
    if (authError) return authError;

    const { searchParams } = new URL(req.url);
    const parsed = listQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      branchId: searchParams.get("branchId") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const scoped = await resolveScopedBranchId(req, parsed.data.branchId, this.authz);
    if (scoped instanceof NextResponse) return scoped;

    const statuses = parsed.data.status
      ? parsed.data.status
          .split(",")
          .map((s) => s.trim())
          .filter((s): s is WaybillStatus => isValidWaybillStatus(s))
      : undefined;

    const types = parsed.data.type
      ? parsed.data.type
          .split(",")
          .map((t) => t.trim())
          .filter((t): t is WaybillType => isValidWaybillType(t))
      : undefined;

    const result = await this.listUseCase.execute({
      branchId: scoped.branchId,
      statuses,
      types,
      from: parsed.data.from ? new Date(parsed.data.from) : undefined,
      to: parsed.data.to ? new Date(parsed.data.to) : undefined,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });

    return NextResponse.json({
      items: result.items.map(toWaybillSummaryDto),
      total: result.total,
      page: parsed.data.page,
      pageSize: parsed.data.pageSize,
    });
  }

  async create(req: NextRequest): Promise<NextResponse> {
    const authError = await requirePermission(req, "waybills:write", this.authz);
    if (authError) return authError;

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const parsed = createWaybillSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    if (parsed.data.type === "carta_porte") {
      const stampError = await requirePermission(req, "waybills:stamp", this.authz);
      if (stampError) return stampError;
    }

    const userId = req.headers.get("x-user-id");
    if (!userId) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

    try {
      const waybill = await this.createUseCase.execute(parsed.data, userId);
      return NextResponse.json(toWaybillDto(waybill), { status: 201 });
    } catch (err) {
      if (err instanceof InvalidBranchPairError) {
        return NextResponse.json({ error: "InvalidBranchPair", detail: err.message }, { status: 400 });
      }
      if (err instanceof BranchAddressIncompleteError) {
        return NextResponse.json(
          { error: "BranchAddressIncomplete", branchId: err.branchId, missingFields: err.missingFields },
          { status: 400 }
        );
      }
      if (err instanceof ProductRequiredForSimpleTransferError) {
        return NextResponse.json(
          { error: "ProductRequiredForSimpleTransfer", itemIndex: err.itemIndex },
          { status: 400 }
        );
      }
      if (err instanceof ProductNotFoundForTransferError) {
        return NextResponse.json({ error: "ProductNotFound", productId: err.productId }, { status: 400 });
      }
      if (err instanceof InsufficientStockAtOriginError) {
        return NextResponse.json({ error: "InsufficientStockAtOrigin", productId: err.productId }, { status: 409 });
      }
      if (err instanceof FacturamaStampError) {
        return NextResponse.json({ error: "FacturamaStampError", detail: err.detail }, { status: 422 });
      }
      if (err instanceof CanonicalFolioMissingError) {
        return NextResponse.json({ error: "CanonicalFolioMissing", folioCode: err.folioCode }, { status: 500 });
      }
      throw err;
    }
  }

  async getById(req: NextRequest, id: string): Promise<NextResponse> {
    const authError = await requirePermission(req, "waybills:read", this.authz);
    if (authError) return authError;

    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: "Invalid ID format" }, { status: 400 });
    }

    try {
      const waybill = await this.getUseCase.execute(id);
      const scopeError = await enforceEitherBranchScope(
        req,
        waybill.originBranchId,
        waybill.destinationBranchId,
        this.authz
      );
      if (scopeError) return scopeError;
      return NextResponse.json(toWaybillDto(waybill));
    } catch (err) {
      if (err instanceof WaybillNotFoundError) {
        return NextResponse.json({ error: "WaybillNotFound" }, { status: 404 });
      }
      throw err;
    }
  }

  async cancel(req: NextRequest, id: string): Promise<NextResponse> {
    const authError = await requirePermission(req, "waybills:cancel", this.authz);
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
      const scopeError = await enforceEitherBranchScope(
        req,
        existing.originBranchId,
        existing.destinationBranchId,
        this.authz
      );
      if (scopeError) return scopeError;

      const waybill = await this.cancelUseCase.execute(id, userId, parsed.data.reason);
      return NextResponse.json(toWaybillDto(waybill));
    } catch (err) {
      if (err instanceof WaybillNotFoundError) {
        return NextResponse.json({ error: "WaybillNotFound" }, { status: 404 });
      }
      if (err instanceof WaybillAlreadyCancelledError) {
        return NextResponse.json({ error: "WaybillAlreadyCancelled" }, { status: 409 });
      }
      if (err instanceof FacturamaCancelError) {
        return NextResponse.json({ error: "FacturamaCancelError", detail: err.detail }, { status: 422 });
      }
      throw err;
    }
  }

  async download(req: NextRequest, id: string): Promise<NextResponse> {
    const authError = await requirePermission(req, "waybills:read", this.authz);
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
      const waybill = await this.getUseCase.execute(id);
      const scopeError = await enforceEitherBranchScope(
        req,
        waybill.originBranchId,
        waybill.destinationBranchId,
        this.authz
      );
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
      if (err instanceof WaybillNotFoundError) {
        return NextResponse.json({ error: "WaybillNotFound" }, { status: 404 });
      }
      if (err instanceof WaybillNotStampedError) {
        return NextResponse.json({ error: "WaybillNotStamped" }, { status: 409 });
      }
      throw err;
    }
  }
}
