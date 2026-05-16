import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(1, "El nombre es requerido"),
  email: z.string().email("Correo inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

export type RegisterFormValues = z.infer<typeof registerSchema>;
