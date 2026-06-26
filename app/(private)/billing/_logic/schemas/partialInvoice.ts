import { z } from "zod";

export const partialInvoiceItemSchema = z.object({
  productId: z.string().uuid().nullable().optional(),
  productCode: z.string().min(1, "Requerido").max(32),
  description: z.string().min(1, "Requerido").max(200),
  satProductCode: z.string().regex(/^\d{8}$/, "8 dígitos").nullable().optional(),
  satUnitCode: z.string().max(10).nullable().optional(),
  unit: z.string().max(60).optional(),
  quantity: z.number().positive("Cantidad debe ser mayor a 0"),
  unitPrice: z.number().min(0, "Precio debe ser >= 0"),
  discountPct: z.number().min(0).max(100).nullable().optional(),
  ivaRate: z.number().min(0).max(1).nullable().optional(),
  iepsRate: z.number().min(0).max(1).nullable().optional(),
});

export const partialInvoiceCustomerSchema = z.object({
  rfc: z.string().min(12, "RFC inválido").max(13),
  name: z.string().min(1, "Requerido").max(200),
  cfdiUse: z.string().min(1, "Requerido").max(8),
  fiscalRegime: z.string().length(3, "3 dígitos"),
  taxZipCode: z.string().regex(/^\d{5}$/, "5 dígitos"),
});

export const partialInvoiceSchema = z.object({
  customer: partialInvoiceCustomerSchema,
  items: z.array(partialInvoiceItemSchema).min(1, "Agrega al menos una línea"),
  paymentForm: z.string().max(4).optional(),
  paymentMethod: z.string().max(4).optional(),
});

export type PartialInvoiceFormValues = z.infer<typeof partialInvoiceSchema>;
