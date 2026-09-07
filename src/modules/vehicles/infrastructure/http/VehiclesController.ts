import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseListQuery } from "@/shared/infrastructure/http/parseListQuery";
import { entityCodeSchema, uuidSchema } from "@/shared/infrastructure/http/validators";
import { ListVehiclesUseCase } from "../../application/use-cases/ListVehiclesUseCase";
import { GetVehicleUseCase } from "../../application/use-cases/GetVehicleUseCase";
import { CreateVehicleUseCase } from "../../application/use-cases/CreateVehicleUseCase";
import { UpdateVehicleUseCase } from "../../application/use-cases/UpdateVehicleUseCase";
import { VehicleNotFoundError } from "../../domain/errors/VehicleNotFoundError";
import { VehicleCodeAlreadyInUseError } from "../../domain/errors/VehicleCodeAlreadyInUseError";
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
  plate: z.string().min(1).max(20),
  vehicleConfig: z.string().min(1).max(10),
  permitType: z.string().min(1).max(10),
  permitNumber: z.string().min(1).max(50),
  insuranceCompany: z.string().min(1).max(150),
  insurancePolicy: z.string().min(1).max(50),
  notes: z.string().nullable().optional(),
});

const updateBodySchema = z
  .object({
    plate: z.string().min(1).max(20).optional(),
    vehicleConfig: z.string().min(1).max(10).optional(),
    permitType: z.string().min(1).max(10).optional(),
    permitNumber: z.string().min(1).max(50).optional(),
    insuranceCompany: z.string().min(1).max(150).optional(),
    insurancePolicy: z.string().min(1).max(50).optional(),
    notes: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.plate !== undefined ||
      d.vehicleConfig !== undefined ||
      d.permitType !== undefined ||
      d.permitNumber !== undefined ||
      d.insuranceCompany !== undefined ||
      d.insurancePolicy !== undefined ||
      d.notes !== undefined ||
      d.isActive !== undefined,
    { message: "At least one field must be provided" }
  );

export class VehiclesController {
  constructor(
    private readonly listUseCase: ListVehiclesUseCase,
    private readonly getUseCase: GetVehicleUseCase,
    private readonly createUseCase: CreateVehicleUseCase,
    private readonly updateUseCase: UpdateVehicleUseCase
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
      const vehicle = await this.getUseCase.execute(parsed.data);
      return NextResponse.json(vehicle);
    } catch (err) {
      const mapped = mapDomainError(err, [[VehicleNotFoundError, 404]]);
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
      const vehicle = await this.createUseCase.execute(parsed.data);
      return NextResponse.json(vehicle, { status: 201 });
    } catch (err) {
      const mapped = mapDomainError(err, [[VehicleCodeAlreadyInUseError, 409]]);
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
      const vehicle = await this.updateUseCase.execute(idParsed.data, parsed.data);
      return NextResponse.json(vehicle);
    } catch (err) {
      const mapped = mapDomainError(err, [[VehicleNotFoundError, 404]]);
      if (mapped) return mapped;
      throw err;
    }
  }
}
