import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ListProductsUseCase } from "../../application/use-cases/ListProductsUseCase";
import { GetProductUseCase } from "../../application/use-cases/GetProductUseCase";
import { CreateProductUseCase } from "../../application/use-cases/CreateProductUseCase";
import { UpdateProductUseCase } from "../../application/use-cases/UpdateProductUseCase";
import { SoftDeleteProductUseCase } from "../../application/use-cases/SoftDeleteProductUseCase";
import { UploadProductImageUseCase, InvalidImageFormatError, ImageTooLargeError } from "../../application/use-cases/UploadProductImageUseCase";
import { DeleteProductImageUseCase } from "../../application/use-cases/DeleteProductImageUseCase";
import { ProductNotFoundError } from "../../domain/errors/ProductNotFoundError";
import { ProductCodeAlreadyInUseError } from "../../domain/errors/ProductCodeAlreadyInUseError";
import { ProductDepartmentNotFoundError } from "../../domain/errors/ProductDepartmentNotFoundError";
import { ProductTaxRateNotFoundError } from "../../domain/errors/ProductTaxRateNotFoundError";

const CODE_REGEX = /^[A-Z0-9_]{1,32}$/;
const SAT_PRODUCT_CODE_REGEX = /^\d{8}$/;
const SUPABASE_BUCKET_HOST = "supabase.co/storage/v1/object/public/product-images";

const uuidParamSchema = z.string().uuid("Invalid product ID format");

const taxRateSchema = z
  .number()
  .min(0, "tax rate must be between 0 and 100")
  .max(100, "tax rate must be between 0 and 100")
  .nullable()
  .optional()
  .transform((v) => (v == null ? v : v > 1 ? v / 100 : v));

const imageUrlSchema = z
  .string()
  .url()
  .max(2048)
  .refine((u) => u.includes(SUPABASE_BUCKET_HOST), { message: "Invalid image URL" })
  .nullable()
  .optional();

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100, "pageSize must not exceed 100").default(20),
  includeInactive: z.string().optional().transform((v) => v === "true"),
  search: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined)
    .pipe(z.string().min(2, "search must be at least 2 characters").optional()),
  departmentId: z.string().uuid("departmentId must be a valid UUID").optional(),
  providerId: z.string().uuid("providerId must be a valid UUID").optional(),
});

const createBodySchema = z.object({
  code: z
    .string()
    .min(1)
    .max(32)
    .transform((v) => v.trim().toUpperCase())
    .pipe(z.string().regex(CODE_REGEX, "code must match ^[A-Z0-9_]{1,32}$")),
  name: z.string().min(1).max(200),
  unit: z.string().min(1).max(32),
  departmentId: z.string().uuid("departmentId must be a valid UUID"),
  taxRateId: z.string().uuid("taxRateId must be a valid UUID").nullable().optional(),
  satProductCode: z
    .string()
    .regex(SAT_PRODUCT_CODE_REGEX, "satProductCode must be 8 digits")
    .nullable()
    .optional(),
  ivaRate: taxRateSchema,
  iepsRate: taxRateSchema,
  imageUrl: imageUrlSchema,
  isTaxable: z.boolean().optional().default(false),
  isActive: z.boolean().optional(),
});

const updateBodySchema = z
  .object({
    name: z.string().min(1).max(200).optional(),
    unit: z.string().min(1).max(32).optional(),
    departmentId: z.string().uuid("departmentId must be a valid UUID").optional(),
    taxRateId: z.string().uuid("taxRateId must be a valid UUID").nullable().optional(),
    satProductCode: z
      .string()
      .regex(SAT_PRODUCT_CODE_REGEX, "satProductCode must be 8 digits")
      .nullable()
      .optional(),
    ivaRate: taxRateSchema,
    iepsRate: taxRateSchema,
    imageUrl: imageUrlSchema,
    isTaxable: z.boolean().optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.unit !== undefined ||
      d.departmentId !== undefined ||
      d.taxRateId !== undefined ||
      d.satProductCode !== undefined ||
      d.ivaRate !== undefined ||
      d.iepsRate !== undefined ||
      d.imageUrl !== undefined ||
      d.isTaxable !== undefined ||
      d.isActive !== undefined,
    { message: "At least one field must be provided" }
  );

export class ProductsController {
  constructor(
    private readonly listUseCase: ListProductsUseCase,
    private readonly getUseCase: GetProductUseCase,
    private readonly createUseCase: CreateProductUseCase,
    private readonly updateUseCase: UpdateProductUseCase,
    private readonly softDeleteUseCase: SoftDeleteProductUseCase,
    private readonly uploadImageUseCase: UploadProductImageUseCase,
    private readonly deleteImageUseCase: DeleteProductImageUseCase,
  ) {}

  async list(req: NextRequest): Promise<NextResponse> {
    const { searchParams } = new URL(req.url);
    const parsed = listQuerySchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      includeInactive: searchParams.get("includeInactive") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      departmentId: searchParams.get("departmentId") ?? undefined,
      providerId: searchParams.get("providerId") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const result = await this.listUseCase.execute(parsed.data);
    return NextResponse.json(result);
  }

  async getById(_req: NextRequest, id: string): Promise<NextResponse> {
    const parsed = uuidParamSchema.safeParse(id);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    try {
      const product = await this.getUseCase.execute(parsed.data);
      return NextResponse.json(product);
    } catch (err) {
      if (err instanceof ProductNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
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
      const product = await this.createUseCase.execute(parsed.data);
      return NextResponse.json(product, { status: 201 });
    } catch (err) {
      if (err instanceof ProductCodeAlreadyInUseError) return NextResponse.json({ error: err.message }, { status: 409 });
      if (err instanceof ProductDepartmentNotFoundError) return NextResponse.json({ error: err.message }, { status: 400 });
      if (err instanceof ProductTaxRateNotFoundError) return NextResponse.json({ error: "Tax rate not found or inactive" }, { status: 400 });
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
      const product = await this.updateUseCase.execute(idParsed.data, parsed.data);
      return NextResponse.json(product);
    } catch (err) {
      if (err instanceof ProductNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      if (err instanceof ProductDepartmentNotFoundError) return NextResponse.json({ error: err.message }, { status: 400 });
      if (err instanceof ProductTaxRateNotFoundError) return NextResponse.json({ error: "Tax rate not found or inactive" }, { status: 400 });
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
      if (err instanceof ProductNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      throw err;
    }
  }

  async uploadImage(req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidParamSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }

    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
    }

    const file = formData.get("file");
    if (!(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing file field" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    try {
      const imageUrl = await this.uploadImageUseCase.execute({
        productId: idParsed.data,
        buffer,
        mime: file.type,
        sizeBytes: buffer.byteLength,
      });
      return NextResponse.json({ imageUrl });
    } catch (err) {
      if (err instanceof InvalidImageFormatError) return NextResponse.json({ error: err.message }, { status: 400 });
      if (err instanceof ImageTooLargeError) return NextResponse.json({ error: err.message, maxBytes: err.maxBytes }, { status: 413 });
      if (err instanceof ProductNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      throw err;
    }
  }

  async deleteImage(_req: NextRequest, id: string): Promise<NextResponse> {
    const idParsed = uuidParamSchema.safeParse(id);
    if (!idParsed.success) {
      return NextResponse.json({ error: idParsed.error.errors[0].message }, { status: 400 });
    }
    try {
      await this.deleteImageUseCase.execute(idParsed.data);
      return new NextResponse(null, { status: 204 });
    } catch (err) {
      if (err instanceof ProductNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
      throw err;
    }
  }
}
