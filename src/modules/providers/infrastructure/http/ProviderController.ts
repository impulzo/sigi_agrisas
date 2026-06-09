import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ListProvidersUseCase } from "../../application/use-cases/ListProvidersUseCase";
import { GetProviderUseCase } from "../../application/use-cases/GetProviderUseCase";
import { CreateProviderUseCase } from "../../application/use-cases/CreateProviderUseCase";
import { UpdateProviderUseCase } from "../../application/use-cases/UpdateProviderUseCase";
import { SoftDeleteProviderUseCase } from "../../application/use-cases/SoftDeleteProviderUseCase";
import { ProviderNotFoundError } from "../../domain/errors/ProviderNotFoundError";
import { ProviderCodeAlreadyInUseError } from "../../domain/errors/ProviderCodeAlreadyInUseError";
import { ProviderRfcAlreadyInUseError } from "../../domain/errors/ProviderRfcAlreadyInUseError";

const RFC_REGEX = /^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$/;
const TAX_REGIME_REGEX = /^\d{3}$/;
const CFDI_USE_REGEX = /^[A-Z]\d{2}$/;
const TAX_ZIP_CODE_REGEX = /^\d{5}$/;
const CODE_REGEX = /^[A-Z0-9_]{1,32}$/;

const uuidParamSchema = z.string().uuid("Invalid provider ID format");

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100, "pageSize must not exceed 100").default(20),
  includeInactive: z.string().optional().transform((v) => v === "true"),
  search: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined)
    .pipe(z.string().min(2, "search must be at least 2 characters").optional()),
});

const createBodySchema = z.object({
  code: z
    .string()
    .min(1)
    .max(32)
    .transform((v) => v.trim().toUpperCase())
    .pipe(z.string().regex(CODE_REGEX, "code must match ^[A-Z0-9_]{1,32}$")),
  name: z.string().min(1).max(120),
  rfc: z
    .string()
    .min(1)
    .transform((v) => v.trim().toUpperCase())
    .pipe(z.string().regex(RFC_REGEX, "rfc must be a valid Mexican RFC")),
  legalName: z.string().max(200).nullable().optional(),
  taxRegime: z
    .string()
    .regex(TAX_REGIME_REGEX, "taxRegime must be 3 digits")
    .transform((v) => v.trim().toUpperCase())
    .nullable()
    .optional(),
  cfdiUse: z
    .string()
    .regex(CFDI_USE_REGEX, "cfdiUse must match ^[A-Z]\\d{2}$")
    .transform((v) => v.trim().toUpperCase())
    .nullable()
    .optional(),
  taxZipCode: z
    .string()
    .regex(TAX_ZIP_CODE_REGEX, "taxZipCode must be 5 digits")
    .nullable()
    .optional(),
  email: z.string().email("invalid email").nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  contactName: z.string().max(120).nullable().optional(),
  notes: z.string().nullable().optional(),
});

const updateBodySchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    rfc: z
      .string()
      .min(1)
      .transform((v) => v.trim().toUpperCase())
      .pipe(z.string().regex(RFC_REGEX, "rfc must be a valid Mexican RFC"))
      .optional(),
    legalName: z.string().max(200).nullable().optional(),
    taxRegime: z
      .string()
      .regex(TAX_REGIME_REGEX, "taxRegime must be 3 digits")
      .transform((v) => v.trim().toUpperCase())
      .nullable()
      .optional(),
    cfdiUse: z
      .string()
      .regex(CFDI_USE_REGEX, "cfdiUse must match ^[A-Z]\\d{2}$")
      .transform((v) => v.trim().toUpperCase())
      .nullable()
      .optional(),
    taxZipCode: z.string().regex(TAX_ZIP_CODE_REGEX, "taxZipCode must be 5 digits").nullable().optional(),
    email: z.string().email("invalid email").nullable().optional(),
    phone: z.string().max(30).nullable().optional(),
    address: z.string().max(300).nullable().optional(),
    contactName: z.string().max(120).nullable().optional(),
    notes: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.rfc !== undefined ||
      d.legalName !== undefined ||
      d.taxRegime !== undefined ||
      d.cfdiUse !== undefined ||
      d.taxZipCode !== undefined ||
      d.email !== undefined ||
      d.phone !== undefined ||
      d.address !== undefined ||
      d.contactName !== undefined ||
      d.notes !== undefined ||
      d.isActive !== undefined,
    { message: "At least one field must be provided" }
  );

export class ProviderController {
  constructor(
    private readonly listUseCase: ListProvidersUseCase,
    private readonly getUseCase: GetProviderUseCase,
    private readonly createUseCase: CreateProviderUseCase,
    private readonly updateUseCase: UpdateProviderUseCase,
    private readonly softDeleteUseCase: SoftDeleteProviderUseCase
  ) {}

  async list(req: NextRequest): Promise<NextResponse> {
    const { searchParams } = new URL(req.url);
    const parsed = listQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      includeInactive: searchParams.get("includeInactive") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const result = await this.listUseCase.execute(parsed.data);
    return NextResponse.json(result);
  }

  async getById(_req: NextRequest, id: string): Promise<NextResponse> {
    const parsed = uuidParamSchema.safeParse(id);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    try {
      const provider = await this.getUseCase.execute(parsed.data);
      return NextResponse.json(provider);
    } catch (err) {
      if (err instanceof ProviderNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      throw err;
    }
  }

  async create(req: NextRequest): Promise<NextResponse> {
    const body = await req.json().catch(() => ({}));
    const parsed = createBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    try {
      const provider = await this.createUseCase.execute(parsed.data);
      return NextResponse.json(provider, { status: 201 });
    } catch (err) {
      if (err instanceof ProviderCodeAlreadyInUseError) return NextResponse.json({ error: err.message }, { status: 409 });
      if (err instanceof ProviderRfcAlreadyInUseError) return NextResponse.json({ error: err.message }, { status: 409 });
      throw err;
    }
  }

  async update(req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidParamSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const parsed = updateBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    try {
      const provider = await this.updateUseCase.execute(idParsed.data, parsed.data);
      return NextResponse.json(provider);
    } catch (err) {
      if (err instanceof ProviderNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      if (err instanceof ProviderRfcAlreadyInUseError) return NextResponse.json({ error: err.message }, { status: 409 });
      throw err;
    }
  }

  async softDelete(_req: NextRequest, id: string): Promise<NextResponse> {
    const parsed = uuidParamSchema.safeParse(id);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    try {
      await this.softDeleteUseCase.execute(parsed.data);
      return new NextResponse(null, { status: 204 });
    } catch (err) {
      if (err instanceof ProviderNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      throw err;
    }
  }
}
