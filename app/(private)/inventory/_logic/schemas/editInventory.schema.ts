import { z } from "zod";

export const editInventorySchema = z
  .object({
    quantity: z.number().int().min(0, "La cantidad no puede ser negativa.").optional(),
    reservedQuantity: z.number().int().min(0, "La cantidad reservada no puede ser negativa.").optional(),
    reorderPoint: z.number().int().min(0, "El punto de reorden no puede ser negativo.").optional(),
  })
  .refine(
    (d) => d.quantity !== undefined || d.reservedQuantity !== undefined || d.reorderPoint !== undefined,
    { message: "Debes modificar al menos un campo." },
  );

export type EditInventoryFormValues = z.infer<typeof editInventorySchema>;
