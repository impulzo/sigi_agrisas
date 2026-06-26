import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseListQuery } from "@/shared/infrastructure/http/parseListQuery";
import { ListTaxRatesUseCase } from "../../application/use-cases/ListTaxRatesUseCase";
import { GetTaxRateUseCase } from "../../application/use-cases/GetTaxRateUseCase";
import { CreateTaxRateUseCase } from "../../application/use-cases/CreateTaxRateUseCase";
import { UpdateTaxRateUseCase } from "../../application/use-cases/UpdateTaxRateUseCase";
import { DeactivateTaxRateUseCase } from "../../application/use-cases/DeactivateTaxRateUseCase";
import { TaxRateNotFoundError, TaxRateCodeAlreadyInUseError, TaxRateInUseByProductsError } from "../../domain/errors";

const uuidSchema = z.string().uuid("Invalid ID format");

const createBodySchema = z.object({
  code: z.string().regex(/^[A-Z0-9_]{1,32}$/, "code must be uppercase letters, digits, or underscores (1–32 chars)"),
  name: z.string().min(1).max(100),
  description: z.string().max(1000).nullable().optional(),
  rate: z.number().min(0).max(1, "rate must be between 0 and 1"),
  isActive: z.boolean().optional(),
});

const updateBodySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(1000).nullable().optional(),
    rate: z.number().min(0).max(1, "rate must be between 0 and 1").optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) => d.name !== undefined || d.description !== undefined || d.rate !== undefined || d.isActive !== undefined,
    { message: "At least one field must be provided" }
  );

export class TaxRatesController {
  constructor(
    private readonly listUseCase: ListTaxRatesUseCase,
    private readonly getUseCase: GetTaxRateUseCase,
    private readonly createUseCase: CreateTaxRateUseCase,
    private readonly updateUseCase: UpdateTaxRateUseCase,
    private readonly deactivateUseCase: DeactivateTaxRateUseCase
  ) {}

  async list(req: NextRequest): Promise<NextResponse> {
    const parsed = parseListQuery(new URL(req.url).searchParams);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const result = await this.listUseCase.execute(parsed.data);
    return NextResponse.json(result);
  }

  async getById(_req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    try {
      return NextResponse.json(await this.getUseCase.execute(idParsed.data));
    } catch (err) {
      if (err instanceof TaxRateNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      throw err;
    }
  }

  async create(req: NextRequest): Promise<NextResponse> {
    const body = await req.json().catch(() => null);
    const parsed = createBodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    try {
      const result = await this.createUseCase.execute(parsed.data);
      return NextResponse.json(result, { status: 201 });
    } catch (err) {
      if (err instanceof TaxRateCodeAlreadyInUseError) return NextResponse.json({ error: err.message, field: "code" }, { status: 409 });
      throw err;
    }
  }

  async update(req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    const body = await req.json().catch(() => null);
    const parsed = updateBodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    try {
      return NextResponse.json(await this.updateUseCase.execute(idParsed.data, parsed.data));
    } catch (err) {
      if (err instanceof TaxRateNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      throw err;
    }
  }

  async deactivate(_req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    try {
      return NextResponse.json(await this.deactivateUseCase.execute(idParsed.data));
    } catch (err) {
      if (err instanceof TaxRateNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      if (err instanceof TaxRateInUseByProductsError) return NextResponse.json({ error: "TaxRateInUse", productCount: err.count }, { status: 409 });
      throw err;
    }
  }
}
