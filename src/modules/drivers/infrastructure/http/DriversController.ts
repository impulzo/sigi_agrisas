import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseListQuery } from "@/shared/infrastructure/http/parseListQuery";
import { optionalRfcSchema, entityCodeSchema, uuidSchema } from "@/shared/infrastructure/http/validators";
import { ListDriversUseCase } from "../../application/use-cases/ListDriversUseCase";
import { GetDriverUseCase } from "../../application/use-cases/GetDriverUseCase";
import { CreateDriverUseCase } from "../../application/use-cases/CreateDriverUseCase";
import { UpdateDriverUseCase } from "../../application/use-cases/UpdateDriverUseCase";
import { DriverNotFoundError } from "../../domain/errors/DriverNotFoundError";
import { DriverCodeAlreadyInUseError } from "../../domain/errors/DriverCodeAlreadyInUseError";
import { mapDomainError } from "@/shared/infrastructure/http/mapDomainError";

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
    .pipe(entityCodeSchema),
  name: z.string().min(1).max(150),
  rfc: optionalRfcSchema,
  licenseNumber: z.string().min(1).max(50),
  notes: z.string().nullable().optional(),
});

const updateBodySchema = z
  .object({
    name: z.string().min(1).max(150).optional(),
    rfc: optionalRfcSchema,
    licenseNumber: z.string().min(1).max(50).optional(),
    notes: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.rfc !== undefined ||
      d.licenseNumber !== undefined ||
      d.notes !== undefined ||
      d.isActive !== undefined,
    { message: "At least one field must be provided" }
  );

export class DriversController {
  constructor(
    private readonly listUseCase: ListDriversUseCase,
    private readonly getUseCase: GetDriverUseCase,
    private readonly createUseCase: CreateDriverUseCase,
    private readonly updateUseCase: UpdateDriverUseCase
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
      const driver = await this.getUseCase.execute(parsed.data);
      return NextResponse.json(driver);
    } catch (err) {
      const mapped = mapDomainError(err, [[DriverNotFoundError, 404]]);
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
      const driver = await this.createUseCase.execute(parsed.data);
      return NextResponse.json(driver, { status: 201 });
    } catch (err) {
      const mapped = mapDomainError(err, [[DriverCodeAlreadyInUseError, 409]]);
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
      const driver = await this.updateUseCase.execute(idParsed.data, parsed.data);
      return NextResponse.json(driver);
    } catch (err) {
      const mapped = mapDomainError(err, [[DriverNotFoundError, 404]]);
      if (mapped) return mapped;
      throw err;
    }
  }
}
