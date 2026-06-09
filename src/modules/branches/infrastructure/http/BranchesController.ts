import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseListQuery } from "@/shared/infrastructure/http/parseListQuery";
import { ListBranchesUseCase } from "@/modules/branches/application/use-cases/ListBranchesUseCase";
import { GetBranchUseCase } from "@/modules/branches/application/use-cases/GetBranchUseCase";
import { CreateBranchUseCase } from "@/modules/branches/application/use-cases/CreateBranchUseCase";
import { UpdateBranchUseCase } from "@/modules/branches/application/use-cases/UpdateBranchUseCase";
import { SoftDeleteBranchUseCase } from "@/modules/branches/application/use-cases/SoftDeleteBranchUseCase";
import { BranchNotFoundError } from "@/modules/branches/domain/errors/BranchNotFoundError";
import { BranchCodeAlreadyInUseError } from "@/modules/branches/domain/errors/BranchCodeAlreadyInUseError";
import { AnotherBranchIsHeadquartersError } from "@/modules/branches/domain/errors/AnotherBranchIsHeadquartersError";

const uuidSchema = z.string().uuid("Invalid ID format");

const createBodySchema = z.object({
  code: z.string().regex(/^[A-Z0-9_]{1,32}$/, "code must be uppercase letters, digits, or underscores (1–32 chars)"),
  name: z.string().min(1).max(100),
  address: z.string().max(300).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email("Invalid email format").max(120).nullable().optional(),
  isHeadquarters: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const updateBodySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    address: z.string().max(300).nullable().optional(),
    phone: z.string().max(30).nullable().optional(),
    email: z.string().email("Invalid email format").max(120).nullable().optional(),
    isHeadquarters: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.address !== undefined ||
      d.phone !== undefined ||
      d.email !== undefined ||
      d.isHeadquarters !== undefined ||
      d.isActive !== undefined,
    {
      message: "At least one field (name, address, phone, email, isHeadquarters, isActive) must be provided",
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
      if (err instanceof BranchNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
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
      if (err instanceof BranchCodeAlreadyInUseError) return NextResponse.json({ error: err.message }, { status: 409 });
      if (err instanceof AnotherBranchIsHeadquartersError) return NextResponse.json({ error: err.message }, { status: 409 });
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
      if (err instanceof BranchNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      if (err instanceof AnotherBranchIsHeadquartersError) return NextResponse.json({ error: err.message }, { status: 409 });
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
      if (err instanceof BranchNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      throw err;
    }
  }
}
