import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseListQuery } from "@/shared/infrastructure/http/parseListQuery";
import { ListProvidersUseCase } from "../../application/use-cases/ListProvidersUseCase";
import { GetProviderUseCase } from "../../application/use-cases/GetProviderUseCase";
import { CreateProviderUseCase } from "../../application/use-cases/CreateProviderUseCase";
import { UpdateProviderUseCase } from "../../application/use-cases/UpdateProviderUseCase";
import { SoftDeleteProviderUseCase } from "../../application/use-cases/SoftDeleteProviderUseCase";
import { ProviderNotFoundError } from "../../domain/errors/ProviderNotFoundError";
import { ProviderCodeAlreadyInUseError } from "../../domain/errors/ProviderCodeAlreadyInUseError";
import { ProviderRfcAlreadyInUseError } from "../../domain/errors/ProviderRfcAlreadyInUseError";
import { ProviderHasDepartmentsError } from "../../domain/errors/ProviderHasDepartmentsError";
import { optionalRfcSchema, taxRegimeSchema, uuidSchema } from "@/shared/infrastructure/http/validators";
import { mapDomainError } from "@/shared/infrastructure/http/mapDomainError";

const CFDI_USE_REGEX = /^[A-Z]\d{2}$/;
const TAX_ZIP_CODE_REGEX = /^\d{5}$/;
const CODE_REGEX = /^[A-Z0-9_]{1,32}$/;

const uuidParamSchema = uuidSchema;

const listQueryFiltersSchema = z.object({
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
  rfc: optionalRfcSchema,
  legalName: z.string().max(200).nullable().optional(),
  taxRegime: taxRegimeSchema.nullable().optional(),
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
  creditLimit: z.number().min(0).nullable().optional(),
  initialBalance: z.number().min(0).optional(),
  creditDays: z.coerce.number().int().min(0).optional(),
});

const updateBodySchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    rfc: optionalRfcSchema,
    legalName: z.string().max(200).nullable().optional(),
    taxRegime: taxRegimeSchema.nullable().optional(),
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
    creditLimit: z.number().min(0).nullable().optional(),
    initialBalance: z.number().min(0).optional(),
    creditDays: z.coerce.number().int().min(0).optional(),
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
      d.creditLimit !== undefined ||
      d.initialBalance !== undefined ||
      d.creditDays !== undefined ||
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
    const parsed = parseListQuery(searchParams);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const filtersParsed = listQueryFiltersSchema.safeParse({
      search: searchParams.get("search") ?? undefined,
    });
    if (!filtersParsed.success) {
      return NextResponse.json({ error: filtersParsed.error.errors[0].message }, { status: 400 });
    }
    const result = await this.listUseCase.execute({ ...parsed.data, ...filtersParsed.data });
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
      const mapped = mapDomainError(err, [[ProviderNotFoundError, 404]]);
      if (mapped) return mapped;
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
      const mapped = mapDomainError(err, [
        [ProviderCodeAlreadyInUseError, 409],
        [ProviderRfcAlreadyInUseError, 409],
      ]);
      if (mapped) return mapped;
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
      const mapped = mapDomainError(err, [
        [ProviderNotFoundError, 404],
        [ProviderRfcAlreadyInUseError, 409],
      ]);
      if (mapped) return mapped;
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
      const mapped = mapDomainError(err, [[ProviderNotFoundError, 404]]);
      if (mapped) return mapped;
      if (err instanceof ProviderHasDepartmentsError) return NextResponse.json({ error: "ProviderHasDepartments", departmentCount: err.departmentCount }, { status: 409 });
      throw err;
    }
  }
}
