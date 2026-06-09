import { z } from "zod";

export const customerQuickAddSchema = z.object({
  code: z
    .string()
    .regex(/^[A-Z0-9_]{1,32}$/, "Solo mayúsculas, números y guion bajo (máx 32 chars)"),
  name: z
    .string()
    .min(1, "El nombre es requerido")
    .max(120, "Máximo 120 caracteres"),
  rfc: z
    .string()
    .regex(
      /^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$/,
      "RFC inválido (ej. XAXX010101000)"
    ),
  legalName: z.string().max(200).optional(),
  taxRegime: z
    .string()
    .regex(/^\d{3}$/, "Régimen fiscal inválido (ej. 601)")
    .optional(),
  cfdiUse: z
    .string()
    .regex(/^[A-Z]\d{2}$/, "Uso CFDI inválido (ej. G03)")
    .optional(),
  taxZipCode: z
    .string()
    .regex(/^\d{5}$/, "Código postal inválido")
    .optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  phone: z.string().max(20).optional(),
});

export type CustomerQuickAddSchema = z.infer<typeof customerQuickAddSchema>;
