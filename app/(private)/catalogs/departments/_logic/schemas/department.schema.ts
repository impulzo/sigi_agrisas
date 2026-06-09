import { z } from "zod";

export const createDepartmentSchema = z.object({
  code: z.string().regex(/^[A-Z0-9_]{1,32}$/, "Código inválido (A-Z, 0-9, _, máx 32)"),
  name: z.string().min(1).max(100),
  description: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateDepartmentFormValues = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentFormValues = z.infer<typeof updateDepartmentSchema>;
