import { z } from "zod";

export const createPriceSchema = z.object({
  name: z.string().min(1, "El nombre del precio es obligatorio.").max(60),
  price: z.number().min(0, "El precio no puede ser negativo."),
  minQuantity: z.number().int().min(1, "La cantidad mínima debe ser al menos 1.").optional(),
  discountPct: z.number().min(0).max(100).nullable().optional(),
  isDefault: z.boolean().optional(),
});

export const updatePriceSchema = z
  .object({
    name: z.string().min(1).max(60).optional(),
    price: z.number().min(0).optional(),
    minQuantity: z.number().int().min(1).optional(),
    discountPct: z.number().min(0).max(100).nullable().optional(),
    isDefault: z.boolean().optional(),
  })
  .refine(
    (d) =>
      d.name !== undefined ||
      d.price !== undefined ||
      d.minQuantity !== undefined ||
      d.discountPct !== undefined ||
      d.isDefault !== undefined,
    { message: "Debes modificar al menos un campo." },
  );

export type CreatePriceFormValues = z.infer<typeof createPriceSchema>;
export type UpdatePriceFormValues = z.infer<typeof updatePriceSchema>;
