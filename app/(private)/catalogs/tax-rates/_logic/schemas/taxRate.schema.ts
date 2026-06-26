import { z } from "zod";

export const createTaxRateSchema = z.object({
  code: z.string().regex(/^[A-Z0-9_]{1,32}$/, "Código inválido (letras mayúsculas, dígitos o guión bajo, 1–32 caracteres)"),
  name: z.string().min(1, "Nombre requerido").max(100, "Máximo 100 caracteres"),
  description: z.string().max(1000).nullable().optional(),
  rate: z.number({ invalid_type_error: "Tasa requerida" }).min(0, "Mínimo 0").max(100, "Máximo 100"),
  isActive: z.boolean().optional(),
});

export const updateTaxRateSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  rate: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});
