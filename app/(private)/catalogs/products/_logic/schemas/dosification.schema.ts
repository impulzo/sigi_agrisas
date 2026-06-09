import { z } from "zod";

export const createDosificationSchema = z.object({
  name: z.string().min(1, "El nombre de la dosificación es obligatorio.").max(60),
  numParts: z
    .number()
    .int()
    .min(2, "El número de partes debe ser al menos 2."),
  isActive: z.boolean().optional(),
});

export const updateDosificationSchema = z
  .object({
    name: z.string().min(1).max(60).optional(),
    numParts: z.number().int().min(2, "El número de partes debe ser al menos 2.").optional(),
    isActive: z.boolean().optional(),
  })
  .refine(
    (d) => d.name !== undefined || d.numParts !== undefined || d.isActive !== undefined,
    { message: "Debes modificar al menos un campo." },
  );

export type CreateDosificationFormValues = z.infer<typeof createDosificationSchema>;
export type UpdateDosificationFormValues = z.infer<typeof updateDosificationSchema>;
