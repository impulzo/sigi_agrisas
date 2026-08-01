import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { SearchSatCodesUseCase } from "../../application/use-cases/SearchSatCodesUseCase";

const searchQuerySchema = z.object({
  search: z
    .string()
    .optional()
    .transform((v) => v?.trim() || undefined)
    .pipe(z.string().min(2, "search must be at least 2 characters").optional()),
});

export class SatCodesController {
  constructor(private readonly searchUseCase: SearchSatCodesUseCase) {}

  async search(req: NextRequest): Promise<NextResponse> {
    const { searchParams } = new URL(req.url);
    const parsed = searchQuerySchema.safeParse({ search: searchParams.get("search") ?? undefined });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.errors[0].message }, { status: 400 });
    }
    const result = await this.searchUseCase.execute(parsed.data.search);
    return NextResponse.json(result);
  }
}
