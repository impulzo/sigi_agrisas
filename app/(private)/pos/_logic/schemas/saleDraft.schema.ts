import { z } from "zod";

export const saleDraftSchema = z.object({
  branchId: z.string().uuid("Selecciona una sucursal"),
  customerId: z.string().uuid().optional(),
  folioId: z.string().uuid("Selecciona un folio"),
  paymentMethodId: z.string().uuid("Selecciona un método de pago"),
  items: z
    .array(
      z.object({
        productId: z.string().uuid(),
        productPriceId: z.string().uuid(),
        quantity: z.number().positive("La cantidad debe ser mayor a 0"),
      })
    )
    .min(1, "El carrito debe tener al menos un producto"),
  notes: z.string().max(1000, "Máximo 1000 caracteres").optional(),
});

export type SaleDraftSchema = z.infer<typeof saleDraftSchema>;
