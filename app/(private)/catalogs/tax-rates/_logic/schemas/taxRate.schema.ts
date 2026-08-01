import { z } from "zod";

const factorTypeSchema = z.enum(["Tasa", "Cuota", "Exento"], { invalid_type_error: "Tipo de factor inválido" });
const satTaxCodeSchema = z.string().regex(/^\d{3}$/, "Clave SAT inválida (3 dígitos, ej. 002=IVA, 003=IEPS)");
// Sin tope superior: "Cuota" es un monto fijo, no un factor 0-1 como "Tasa".
const rateSchema = z.number({ invalid_type_error: "Tasa/Cuota requerida" }).min(0, "Mínimo 0");
const accountSchema = z.string().max(20, "Máximo 20 caracteres").nullable().optional();

export const createTaxRateSchema = z.object({
  code: z.string().regex(/^[A-Z0-9_]{1,32}$/, "Código inválido (letras mayúsculas, dígitos o guión bajo, 1–32 caracteres)"),
  name: z.string().min(1, "Nombre requerido").max(100, "Máximo 100 caracteres"),
  description: z.string().max(1000).nullable().optional(),
  satTaxCode: satTaxCodeSchema,
  factorType: factorTypeSchema,
  displayValue: z.number({ invalid_type_error: "Valor requerido" }),
  rate: rateSchema,
  transferredAccount: accountSchema,
  pendingTransferredAccount: accountSchema,
  creditedAccount: accountSchema,
  pendingCreditedAccount: accountSchema,
  isActive: z.boolean().optional(),
});

export const updateTaxRateSchema = z.object({
  name: z.string().min(1, "Nombre requerido").max(100).optional(),
  description: z.string().max(1000).nullable().optional(),
  satTaxCode: satTaxCodeSchema.optional(),
  factorType: factorTypeSchema.optional(),
  displayValue: z.number().optional(),
  rate: rateSchema.optional(),
  transferredAccount: accountSchema,
  pendingTransferredAccount: accountSchema,
  creditedAccount: accountSchema,
  pendingCreditedAccount: accountSchema,
  isActive: z.boolean().optional(),
});
