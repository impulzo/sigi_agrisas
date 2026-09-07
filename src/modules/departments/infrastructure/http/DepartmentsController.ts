import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseListQuery } from "@/shared/infrastructure/http/parseListQuery";
import { entityCodeSchema, uuidSchema } from "@/shared/infrastructure/http/validators";
import { ListDepartmentsUseCase } from "@/modules/departments/application/use-cases/ListDepartmentsUseCase";
import { GetDepartmentUseCase } from "@/modules/departments/application/use-cases/GetDepartmentUseCase";
import { CreateDepartmentUseCase } from "@/modules/departments/application/use-cases/CreateDepartmentUseCase";
import { UpdateDepartmentUseCase } from "@/modules/departments/application/use-cases/UpdateDepartmentUseCase";
import { SoftDeleteDepartmentUseCase } from "@/modules/departments/application/use-cases/SoftDeleteDepartmentUseCase";
import { DepartmentNotFoundError } from "@/modules/departments/domain/errors/DepartmentNotFoundError";
import { DepartmentCodeAlreadyInUseError } from "@/modules/departments/domain/errors/DepartmentCodeAlreadyInUseError";
import { ProviderNotFoundOrInactiveError } from "@/modules/departments/domain/errors/ProviderNotFoundOrInactiveError";
import { mapDomainError } from "@/shared/infrastructure/http/mapDomainError";

const listQueryFiltersSchema = z.object({
  providerId: z.string().uuid("providerId must be a valid UUID").optional(),
});

const createBodySchema = z.object({
  code: entityCodeSchema,
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  providerId: z.string().uuid("providerId must be a valid UUID"),
  isActive: z.boolean().optional(),
});

const updateBodySchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).nullable().optional(),
    providerId: z.string().uuid("providerId must be a valid UUID").nullable().optional(),
    isActive: z.boolean().optional(),
  })
  .refine((d) => d.name !== undefined || d.description !== undefined || d.providerId !== undefined || d.isActive !== undefined, {
    message: "At least one field (name, description, providerId, isActive) must be provided",
  });

export class DepartmentsController {
  constructor(
    private readonly listUseCase: ListDepartmentsUseCase,
    private readonly getUseCase: GetDepartmentUseCase,
    private readonly createUseCase: CreateDepartmentUseCase,
    private readonly updateUseCase: UpdateDepartmentUseCase,
    private readonly softDeleteUseCase: SoftDeleteDepartmentUseCase
  ) {}

  async list(req: NextRequest): Promise<NextResponse> {
    const { searchParams } = new URL(req.url);
    const parsed = parseListQuery(searchParams);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const filtersParsed = listQueryFiltersSchema.safeParse({
      providerId: searchParams.get("providerId") ?? undefined,
    });
    if (!filtersParsed.success) {
      return NextResponse.json({ error: filtersParsed.error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      await this.listUseCase.execute({ ...parsed.data, providerId: filtersParsed.data.providerId })
    );
  }

  async getById(_req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidSchema.safeParse(id);
    if (!idParsed.success) return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    try {
      return NextResponse.json(await this.getUseCase.execute(idParsed.data));
    } catch (err) {
      const mapped = mapDomainError(err, [[DepartmentNotFoundError, 404]]);
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
        [DepartmentCodeAlreadyInUseError, 409],
        [ProviderNotFoundOrInactiveError, 400],
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
        [DepartmentNotFoundError, 404],
        [ProviderNotFoundOrInactiveError, 400],
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
      const mapped = mapDomainError(err, [[DepartmentNotFoundError, 404]]);
      if (mapped) return mapped;
      throw err;
    }
  }
}
