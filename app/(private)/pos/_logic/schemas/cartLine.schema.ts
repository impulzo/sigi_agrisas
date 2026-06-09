import { z } from "zod";

export const cartLineSchema = z.object({
  quantity: z.number().positive("La cantidad debe ser mayor a 0"),
  discountPctOverride: z
    .number()
    .min(0, "El descuento no puede ser negativo")
    .max(100, "El descuento no puede superar el 100%")
    .optional(),
});

export type CartLineSchema = z.infer<typeof cartLineSchema>;
