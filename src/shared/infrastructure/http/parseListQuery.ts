import { z } from "zod";

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100, "pageSize must not exceed 100").default(20),
  includeInactive: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export type ListQueryParams = z.infer<typeof listQuerySchema>;

export function parseListQuery(searchParams: URLSearchParams):
  | { success: true; data: ListQueryParams }
  | { success: false; error: string } {
  const result = listQuerySchema.safeParse({
    page: searchParams.get("page") ?? undefined,
    pageSize: searchParams.get("pageSize") ?? undefined,
    includeInactive: searchParams.get("includeInactive") ?? undefined,
  });
  if (!result.success) {
    return { success: false, error: result.error.errors[0].message };
  }
  return { success: true, data: result.data };
}
