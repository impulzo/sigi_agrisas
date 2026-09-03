import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseListQuery } from "@/shared/infrastructure/http/parseListQuery";
import { entityCodeSchema, uuidSchema } from "@/shared/infrastructure/http/validators";
import { mapDomainError } from "@/shared/infrastructure/http/mapDomainError";
import { ListBranchesUseCase } from "@/modules/branches/application/use-cases/ListBranchesUseCase";
import { GetBranchUseCase } from "@/modules/branches/application/use-cases/GetBranchUseCase";
import { CreateBranchUseCase } from "@/modules/branches/application/use-cases/CreateBranchUseCase";
import { UpdateBranchUseCase } from "@/modules/branches/application/use-cases/UpdateBranchUseCase";
import { SoftDeleteBranchUseCase } from "@/modules/branches/application/use-cases/SoftDeleteBranchUseCase";
import { BranchNotFoundError } from "@/modules/branches/domain/errors/BranchNotFoundError";
import { BranchCodeAlreadyInUseError } from "@/modules/branches/domain/errors/BranchCodeAlreadyInUseError";
import { AnotherBranchIsHeadquartersError } from "@/modules/branches/domain/errors/AnotherBranchIsHeadquartersError";

const addressFieldsSchema = {
  addressStreet: z.string().max(150).nullable().optional(),
  addressExteriorNumber: z.string().max(20).nullable().optional(),
  addressInteriorNumber: z.string().max(20).nullable().optional(),
  addressNeighborhood: z.string().max(100).nullable().optional(),
  addressMunicipality: z.string().max(100).nullable().optional(),
  addressState: z
    .string()
    .regex(/^[A-Z]{2,3}$/, "addressState must be a 2-3 uppercase letter SAT state key")
    .nullable()
    .optional(),
  addressCountry: z.string().max(3).nullable().optional(),
  addressZipCode: z
    .string()
    .regex(/^\d{5}$/, "addressZipCode must be a 5-digit code")
    .nullable()
    .optional(),
};

const createBodySchema = z.object({
  code: entityCodeSchema,
  name: z.string().min(1).max(100),
  address: z.string().max(300).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email("Invalid email format").max(120).nullable().optional(),
  isHeadquarters: z.boolean().optional(),
  isActive: z.boolean().optional(),
  ...addressFieldsSchema,
});

const updateBodySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    address: z.string().max(300).nullable().optional(),
    phone: z.string().max(30).nullable().optional(),
    email: z.string().email("Invalid email format").max(120).nullable().optional(),
    isHeadquarters: z.boolean().optional(),
    isActive: z.boolean().optional(),
    ...addressFieldsSchema,
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.address !== undefined ||
      d.phone !== undefined ||
      d.email !== undefined ||
      d.isHeadquarters !== undefined ||
      d.isActive !== undefined ||
      d.addressStreet !== undefined ||
      d.addressExteriorNumber !== undefined ||
      d.addressInteriorNumber !== undefined ||
      d.addressNeighborhood !== undefined ||
      d.addressMunicipality !== undefined ||
      d.addressState !== undefined ||
      d.addressCountry !== undefined ||
      d.addressZipCode !== undefined,
    {
      message: "At least one field must be provided",
    }
  );

export class BranchesController {
  constructor(
    private readonly listUseCase: ListBranchesUseCase,
    private readonly getUseCase: GetBranchUseCase,
    private readonly createUseCase: CreateBranchUseCase,
    private readonly updateUseCase: UpdateBranchUseCase,
    private readonly softDeleteUseCase: SoftDeleteBranchUseCase
  ) {}

  async list(req: NextRequest): Promise<NextResponse> {
    const { searchParams } = new URL(req.url);
    const parsed = parseListQuery(searchParams);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    return NextResponse.json(await this.listUseCase.execute(parsed.data));
  }

  async getById(_req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    try {
      return NextResponse.json(await this.getUseCase.execute(idParsed.data));
    } catch (err) {
      const mapped = mapDomainError(err, [[BranchNotFoundError, 404]]);
      if (mapped) return mapped;
      throw err;
    }
  }

  async create(req: NextRequest): Promise<NextResponse> {
    const body = await req.json().catch(() => ({}));
    const parsed = createBodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    try {
      return NextResponse.json(await this.createUseCase.execute(parsed.data), { status: 201 });
    } catch (err) {
      const mapped = mapDomainError(err, [
        [BranchCodeAlreadyInUseError, 409],
        [AnotherBranchIsHeadquartersError, 409],
      ]);
      if (mapped) return mapped;
      throw err;
    }
  }

  async update(req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    const body = await req.json().catch(() => ({}));
    const parsed = updateBodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    try {
      return NextResponse.json(await this.updateUseCase.execute({ id: idParsed.data, ...parsed.data }));
    } catch (err) {
      const mapped = mapDomainError(err, [
        [BranchNotFoundError, 404],
        [AnotherBranchIsHeadquartersError, 409],
      ]);
      if (mapped) return mapped;
      throw err;
    }
  }

  async softDelete(_req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    try {
      await this.softDeleteUseCase.execute(idParsed.data);
      return new NextResponse(null, { status: 204 });
    } catch (err) {
      const mapped = mapDomainError(err, [[BranchNotFoundError, 404]]);
      if (mapped) return mapped;
      throw err;
    }
  }
}
