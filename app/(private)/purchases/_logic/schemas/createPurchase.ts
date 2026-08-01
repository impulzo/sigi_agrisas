import { z } from "zod";

export const purchaseItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().positive("La cantidad debe ser mayor a 0"),
  unitCost: z.number().min(0, "El costo unitario debe ser mayor o igual a 0"),
  discountPct: z.number().min(0).max(100).nullable().optional(),
});

export const createPurchaseSchema = z.object({
  providerId: z.string().uuid("Selecciona un proveedor"),
  branchId: z.string().uuid(),
  paymentMethodId: z.string().uuid("Selecciona una forma de pago"),
  notes: z.string().max(1000).nullable().optional(),
  items: z.array(purchaseItemSchema).min(1, "Agrega al menos un producto"),
});

export type CreatePurchaseSchema = z.infer<typeof createPurchaseSchema>;
