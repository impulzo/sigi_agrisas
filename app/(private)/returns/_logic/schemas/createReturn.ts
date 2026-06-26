import { z } from "zod";

export const createReturnSchema = z.object({
  reason: z.string().trim().min(3, "El motivo es obligatorio (mín. 3 caracteres)").max(500, "El motivo no puede exceder 500 caracteres"),
  returnedAt: z.string().refine((val) => {
    const d = new Date(val);
    return !isNaN(d.getTime()) && d <= new Date();
  }, "La fecha de devolución no puede ser futura"),
  notes: z.string().max(1000, "Las notas no pueden exceder 1000 caracteres").nullable().optional(),
  items: z.array(z.object({
    saleItemId: z.string().uuid(),
    quantity: z.number().positive("La cantidad debe ser mayor a 0"),
  })).min(1, "Selecciona al menos un producto"),
});

export type CreateReturnFormValues = z.infer<typeof createReturnSchema>;
