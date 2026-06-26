import { z } from "zod";

export const folioScopeSchema = z.enum(["POS", "INVENTORY", "OPERATIONS"]);

export const createFolioSchema = z.object({
  code: z.string().regex(/^[A-Z0-9_]{1,32}$/, "Código inválido (A-Z, 0-9, _, máx 32)"),
  name: z.string().min(1).max(100),
  prefix: z.string().regex(/^[A-Z0-9-]{1,8}$/).nullable().optional(),
  scope: folioScopeSchema,
  currentNumber: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export const updateFolioSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  prefix: z.string().regex(/^[A-Z0-9-]{1,8}$/).nullable().optional(),
  scope: folioScopeSchema.optional(),
  currentNumber: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export type CreateFolioFormValues = z.infer<typeof createFolioSchema>;
export type UpdateFolioFormValues = z.infer<typeof updateFolioSchema>;
