import { z } from "zod";

export const createUserSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres"),
  avatarUrl: z.union([z.string().url("URL inválida"), z.literal("")]).optional(),
  branchId: z.string().uuid().nullable().optional(),
  roleIds: z.array(z.string().uuid()).optional(),
});

export type CreateUserFormValues = z.infer<typeof createUserSchema>;
