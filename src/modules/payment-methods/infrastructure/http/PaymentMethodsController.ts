import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseListQuery } from "@/shared/infrastructure/http/parseListQuery";
import { ListPaymentMethodsUseCase } from "@/modules/payment-methods/application/use-cases/ListPaymentMethodsUseCase";
import { GetPaymentMethodUseCase } from "@/modules/payment-methods/application/use-cases/GetPaymentMethodUseCase";
import { CreatePaymentMethodUseCase } from "@/modules/payment-methods/application/use-cases/CreatePaymentMethodUseCase";
import { UpdatePaymentMethodUseCase } from "@/modules/payment-methods/application/use-cases/UpdatePaymentMethodUseCase";
import { SoftDeletePaymentMethodUseCase } from "@/modules/payment-methods/application/use-cases/SoftDeletePaymentMethodUseCase";
import { PaymentMethodNotFoundError } from "@/modules/payment-methods/domain/errors/PaymentMethodNotFoundError";
import { PaymentMethodCodeAlreadyInUseError } from "@/modules/payment-methods/domain/errors/PaymentMethodCodeAlreadyInUseError";

const uuidSchema = z.string().uuid("Invalid ID format");

const createBodySchema = z.object({
  code: z.string().regex(/^[A-Z0-9_]{1,32}$/, "code must be uppercase letters, digits, or underscores (1–32 chars)"),
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  isCredit: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const updateBodySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => d.name !== undefined || d.description !== undefined || d.isActive !== undefined, {
    message: "At least one field (name, description, isActive) must be provided",
  });

export class PaymentMethodsController {
  constructor(
    private readonly listUseCase: ListPaymentMethodsUseCase,
    private readonly getUseCase: GetPaymentMethodUseCase,
    private readonly createUseCase: CreatePaymentMethodUseCase,
    private readonly updateUseCase: UpdatePaymentMethodUseCase,
    private readonly softDeleteUseCase: SoftDeletePaymentMethodUseCase
  ) {}

  async list(req: NextRequest): Promise<NextResponse> {
    const { searchParams } = new URL(req.url);
    const parsed = parseListQuery(searchParams);
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
      if (err instanceof PaymentMethodNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      throw err;
    }
  }

  async create(req: NextRequest): Promise<NextResponse> {
    const body = await req.json().catch(() => ({}));
    const parsed = createBodySchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    try {
      const result = await this.createUseCase.execute({
        code: parsed.data.code,
        name: parsed.data.name,
        description: parsed.data.description,
        isCredit: parsed.data.isCredit ?? false,
        isActive: parsed.data.isActive,
      });
      return NextResponse.json(result, { status: 201 });
    } catch (err) {
      if (err instanceof PaymentMethodCodeAlreadyInUseError) return NextResponse.json({ error: err.message }, { status: 409 });
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
      if (err instanceof PaymentMethodNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
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
      if (err instanceof PaymentMethodNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      throw err;
    }
  }
}
