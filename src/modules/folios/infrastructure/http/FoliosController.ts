import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseListQuery } from "@/shared/infrastructure/http/parseListQuery";
import { ListFoliosUseCase } from "@/modules/folios/application/use-cases/ListFoliosUseCase";
import { GetFolioUseCase } from "@/modules/folios/application/use-cases/GetFolioUseCase";
import { CreateFolioUseCase } from "@/modules/folios/application/use-cases/CreateFolioUseCase";
import { UpdateFolioUseCase } from "@/modules/folios/application/use-cases/UpdateFolioUseCase";
import { SoftDeleteFolioUseCase } from "@/modules/folios/application/use-cases/SoftDeleteFolioUseCase";
import { FolioNotFoundError } from "@/modules/folios/domain/errors/FolioNotFoundError";
import { FolioCodeAlreadyInUseError } from "@/modules/folios/domain/errors/FolioCodeAlreadyInUseError";

const uuidSchema = z.string().uuid("Invalid ID format");

const createBodySchema = z.object({
  code: z.string().regex(/^[A-Z0-9_]{1,32}$/, "code must be uppercase letters, digits, or underscores (1–32 chars)"),
  name: z.string().min(1).max(100),
  prefix: z
    .string()
    .regex(/^[A-Z0-9-]{1,8}$/, "prefix must be uppercase letters, digits, or hyphens (1–8 chars)")
    .nullable()
    .optional(),
  currentNumber: z.number().int().min(0, "currentNumber must be 0 or greater").optional(),
  isActive: z.boolean().optional(),
});

const updateBodySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    prefix: z
      .string()
      .regex(/^[A-Z0-9-]{1,8}$/, "prefix must be uppercase letters, digits, or hyphens (1–8 chars)")
      .nullable()
      .optional(),
    currentNumber: z.number().int().min(0, "currentNumber must be 0 or greater").optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => d.name !== undefined || d.prefix !== undefined || d.currentNumber !== undefined || d.isActive !== undefined, {
    message: "At least one field (name, prefix, currentNumber, isActive) must be provided",
  });

export class FoliosController {
  constructor(
    private readonly listUseCase: ListFoliosUseCase,
    private readonly getUseCase: GetFolioUseCase,
    private readonly createUseCase: CreateFolioUseCase,
    private readonly updateUseCase: UpdateFolioUseCase,
    private readonly softDeleteUseCase: SoftDeleteFolioUseCase
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
      if (err instanceof FolioNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
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
      if (err instanceof FolioCodeAlreadyInUseError) return NextResponse.json({ error: err.message }, { status: 409 });
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
      if (err instanceof FolioNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
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
      if (err instanceof FolioNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      throw err;
    }
  }
}
