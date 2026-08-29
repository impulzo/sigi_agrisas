import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
  avatarUrl: z.union([z.string().url("URL inválida"), z.literal("")]).optional(),
  branchId: z.string().uuid().nullable().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
