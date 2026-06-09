import { z } from "zod";

export const updateUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    email: z.string().email("Email inválido").optional(),
    avatarUrl: z.union([z.string().url("URL inválida"), z.literal("")]).optional(),
  })
  .refine(
    (d) => d.name !== undefined || d.email !== undefined || d.avatarUrl !== undefined,
    { message: "Al menos un campo debe estar presente" }
  );

export type UpdateUserFormValues = z.infer<typeof updateUserSchema>;
