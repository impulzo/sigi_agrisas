import { z } from "zod";

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const createQuoteSchema = z.object({
  branchId: z.string().uuid("Sucursal requerida"),
  customerId: z.string().uuid("UUID inválido").nullable().optional(),
  folioId: z.string().uuid("Folio requerido"),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        productPriceId: z.string().uuid(),
        quantity: z.number().positive("La cantidad debe ser mayor a 0"),
        discountPctOverride: z.number().min(0).max(100).optional(),
      }),
    )
    .min(1, "La cotización debe tener al menos un artículo"),
  expiresAt: z
    .string()
    .optional()
    .nullable()
    .refine(
      (v) => !v || new Date(v) >= tomorrow(),
      "La fecha de vencimiento debe ser mañana o posterior",
    ),
  notes: z.string().max(1000).optional().nullable(),
});

export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
