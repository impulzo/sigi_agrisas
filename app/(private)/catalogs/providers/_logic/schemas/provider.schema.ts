import { z } from "zod";

const codeRegex = /^[A-Z0-9_]{1,32}$/;
const rfcRegex = /^([A-ZÑ&]{3,4})\d{6}([A-Z\d]{3})$/;
const taxRegimeRegex = /^\d{3}$/;
const cfdiUseRegex = /^[A-Z]\d{2}$/;
const taxZipCodeRegex = /^\d{5}$/;

const codeSchema = z
  .string()
  .regex(codeRegex, "El código debe ser MAYÚSCULAS, dígitos y guiones bajos (máx. 32).");

const rfcSchema = z
  .string()
  .regex(rfcRegex, "RFC inválido. Formato esperado: 3-4 letras + 6 dígitos + 3 alfanuméricos.");

const optionalRfc = z
  .string()
  .regex(rfcRegex, "RFC inválido. Formato esperado: 3-4 letras + 6 dígitos + 3 alfanuméricos.")
  .nullable()
  .optional();

const optionalCreditLimit = z
  .number()
  .min(0, "El límite de crédito no puede ser negativo.")
  .nullable()
  .optional();

const optionalInitialBalance = z
  .number()
  .min(0, "El saldo inicial no puede ser negativo.")
  .optional();

const optionalCreditDays = z
  .number()
  .int("El plazo de crédito debe ser un número entero de días.")
  .min(0, "El plazo de crédito no puede ser negativo.")
  .optional();

const optionalTaxRegime = z
  .string()
  .regex(taxRegimeRegex, "El régimen fiscal debe ser de 3 dígitos (ej. 601).")
  .nullable()
  .optional();

const optionalCfdiUse = z
  .string()
  .regex(cfdiUseRegex, "El uso CFDI debe ser 1 letra + 2 dígitos (ej. G03).")
  .nullable()
  .optional();

const optionalTaxZipCode = z
  .string()
  .regex(taxZipCodeRegex, "El código postal fiscal debe ser de 5 dígitos.")
  .nullable()
  .optional();

const optionalEmail = z
  .string()
  .email("Email inválido.")
  .max(120)
  .nullable()
  .optional();

export const createProviderSchema = z.object({
  code: codeSchema,
  name: z.string().min(1, "El nombre es obligatorio.").max(120),
  rfc: optionalRfc,
  legalName: z.string().max(200).nullable().optional(),
  taxRegime: optionalTaxRegime,
  cfdiUse: optionalCfdiUse,
  taxZipCode: optionalTaxZipCode,
  email: optionalEmail,
  phone: z.string().max(30).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  contactName: z.string().max(120).nullable().optional(),
  notes: z.string().nullable().optional(),
  creditLimit: optionalCreditLimit,
  initialBalance: optionalInitialBalance,
  creditDays: optionalCreditDays,
  isActive: z.boolean().optional(),
});

export const updateProviderSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    rfc: optionalRfc,
    legalName: z.string().max(200).nullable().optional(),
    taxRegime: optionalTaxRegime,
    cfdiUse: optionalCfdiUse,
    taxZipCode: optionalTaxZipCode,
    email: optionalEmail,
    phone: z.string().max(30).nullable().optional(),
    address: z.string().max(300).nullable().optional(),
    contactName: z.string().max(120).nullable().optional(),
    notes: z.string().nullable().optional(),
    creditLimit: optionalCreditLimit,
    initialBalance: optionalInitialBalance,
    creditDays: optionalCreditDays,
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.rfc !== undefined ||
      d.legalName !== undefined ||
      d.taxRegime !== undefined ||
      d.cfdiUse !== undefined ||
      d.taxZipCode !== undefined ||
      d.email !== undefined ||
      d.phone !== undefined ||
      d.address !== undefined ||
      d.contactName !== undefined ||
      d.notes !== undefined ||
      d.creditLimit !== undefined ||
      d.initialBalance !== undefined ||
      d.creditDays !== undefined ||
      d.isActive !== undefined,
    { message: "Debes modificar al menos un campo." }
  );

export type CreateProviderFormValues = z.infer<typeof createProviderSchema>;
export type UpdateProviderFormValues = z.infer<typeof updateProviderSchema>;
