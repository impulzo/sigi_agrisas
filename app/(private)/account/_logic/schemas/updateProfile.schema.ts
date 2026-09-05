import { z } from "zod";

export const emailFieldSchema = z.string().email("Correo inválido");

export const updateProfileSchema = z
  .object({
    name: z.string().min(1, "El nombre no puede estar vacío").optional(),
    email: emailFieldSchema.optional(),
  })
  .refine((d) => d.name !== undefined || d.email !== undefined, {
    message: "Al menos un campo debe estar presente",
  });

export type UpdateProfileFormValues = z.infer<typeof updateProfileSchema>;
