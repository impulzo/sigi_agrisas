import { z } from "zod";

export const assignProductSchema = z.object({
  productId: z.string().uuid("Selecciona un producto válido."),
  quantity: z.number().int().min(0, "La cantidad no puede ser negativa.").optional(),
  reorderPoint: z.number().int().min(0, "El punto de reorden no puede ser negativo.").optional(),
});

export type AssignProductFormValues = z.infer<typeof assignProductSchema>;
