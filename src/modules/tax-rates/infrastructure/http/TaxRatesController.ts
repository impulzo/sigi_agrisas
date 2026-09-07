import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseListQuery } from "@/shared/infrastructure/http/parseListQuery";
import { entityCodeSchema, uuidSchema } from "@/shared/infrastructure/http/validators";
import { mapDomainError } from "@/shared/infrastructure/http/mapDomainError";
import { ListTaxRatesUseCase } from "../../application/use-cases/ListTaxRatesUseCase";
import { GetTaxRateUseCase } from "../../application/use-cases/GetTaxRateUseCase";
import { CreateTaxRateUseCase } from "../../application/use-cases/CreateTaxRateUseCase";
import { UpdateTaxRateUseCase } from "../../application/use-cases/UpdateTaxRateUseCase";
import { DeactivateTaxRateUseCase } from "../../application/use-cases/DeactivateTaxRateUseCase";
import { TaxRateNotFoundError, TaxRateCodeAlreadyInUseError, TaxRateInUseByProductsError } from "../../domain/errors";

const factorTypeSchema = z.enum(["Tasa", "Cuota", "Exento"]);
const satTaxCodeSchema = z.string().regex(/^\d{3}$/, "satTaxCode must be 3 digits (SAT c_Impuesto catalog)");
// "Tasa"/"Exento" are a 0-1 factor; "Cuota" is a fixed monetary amount and has no upper bound.
const rateSchema = z.number().min(0, "rate must be >= 0");

function rateExceedsFactorBound(factorType: "Tasa" | "Cuota" | "Exento", rate: number): boolean {
  return factorType !== "Cuota" && rate > 1;
}
const accountSchema = z.string().max(20).nullable().optional();

const createBodySchema = z
  .object({
    code: entityCodeSchema,
    name: z.string().min(1).max(100),
    description: z.string().max(1000).nullable().optional(),
    satTaxCode: satTaxCodeSchema,
    factorType: factorTypeSchema,
    displayValue: z.number(),
    rate: rateSchema,
    transferredAccount: accountSchema,
    pendingTransferredAccount: accountSchema,
    creditedAccount: accountSchema,
    pendingCreditedAccount: accountSchema,
    isActive: z.boolean().optional(),
  })
  .superRefine((d, ctx) => {
    if (rateExceedsFactorBound(d.factorType, d.rate)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rate"], message: "rate must be <= 1 for factorType Tasa/Exento" });
    }
  });

const updateBodySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(1000).nullable().optional(),
    satTaxCode: satTaxCodeSchema.optional(),
    factorType: factorTypeSchema.optional(),
    displayValue: z.number().optional(),
    rate: rateSchema.optional(),
    transferredAccount: accountSchema,
    pendingTransferredAccount: accountSchema,
    creditedAccount: accountSchema,
    pendingCreditedAccount: accountSchema,
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.description !== undefined ||
      d.satTaxCode !== undefined ||
      d.factorType !== undefined ||
      d.displayValue !== undefined ||
      d.rate !== undefined ||
      d.transferredAccount !== undefined ||
      d.pendingTransferredAccount !== undefined ||
      d.creditedAccount !== undefined ||
      d.pendingCreditedAccount !== undefined ||
      d.isActive !== undefined,
    { message: "At least one field must be provided" }
  )
  .superRefine((d, ctx) => {
    if (d.factorType !== undefined && d.rate !== undefined && rateExceedsFactorBound(d.factorType, d.rate)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rate"], message: "rate must be <= 1 for factorType Tasa/Exento" });
    }
  });

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
      const mapped = mapDomainError(err, [[TaxRateNotFoundError, 404]]);
      if (mapped) return mapped;
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
      const mapped = mapDomainError(err, [[TaxRateNotFoundError, 404]]);
      if (mapped) return mapped;
      throw err;
    }
  }

  async deactivate(_req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    try {
      return NextResponse.json(await this.deactivateUseCase.execute(idParsed.data));
    } catch (err) {
      const mapped = mapDomainError(err, [[TaxRateNotFoundError, 404]]);
      if (mapped) return mapped;
      if (err instanceof TaxRateInUseByProductsError) return NextResponse.json({ error: "TaxRateInUse", productCount: err.count }, { status: 409 });
      throw err;
    }
  }
}
