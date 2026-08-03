import { z } from "zod";

export const registerPaymentItemSchema = z.object({
  saleItemId: z.string().uuid(),
  amount: z.number().positive({ message: "El monto de la línea debe ser mayor a 0" }),
});

export const registerPaymentSchema = z.object({
  amount: z
    .number({ required_error: "El monto es requerido" })
    .positive({ message: "El monto debe ser mayor a 0" }),
  paymentMethodId: z
    .string({ required_error: "El método de pago es requerido" })
    .uuid({ message: "Método de pago inválido" }),
  folioId: z
    .string({ required_error: "El folio es requerido" })
    .uuid({ message: "Folio inválido" }),
  notes: z
    .string()
    .max(1000, { message: "Las notas no pueden exceder 1000 caracteres" })
    .optional(),
  items: z.array(registerPaymentItemSchema).optional(),
});

export type RegisterPaymentInput = z.infer<typeof registerPaymentSchema>;
