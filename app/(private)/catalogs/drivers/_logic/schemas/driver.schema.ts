import { z } from "zod";

const RFC_REGEX = /^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$/;

const optionalRfcField = z
  .string()
  .nullable()
  .optional()
  .refine((v) => !v || RFC_REGEX.test(v), "RFC inválido");

export const createDriverSchema = z.object({
  code: z.string().regex(/^[A-Z0-9_]{1,32}$/, "Código inválido (A-Z, 0-9, _, máx 32)"),
  name: z.string().min(1, "El nombre es obligatorio").max(150),
  rfc: optionalRfcField,
  licenseNumber: z.string().min(1, "La licencia es obligatoria").max(50),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export const updateDriverSchema = z.object({
  name: z.string().min(1).max(150).optional(),
  rfc: optionalRfcField,
  licenseNumber: z.string().min(1).max(50).optional(),
  notes: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type CreateDriverFormValues = z.infer<typeof createDriverSchema>;
export type UpdateDriverFormValues = z.infer<typeof updateDriverSchema>;
