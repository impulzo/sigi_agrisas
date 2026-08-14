import { z } from "zod";

export const purchaseItemSchema = z
  .object({
    productId: z.string().uuid(),
    quantity: z.number().positive("La cantidad debe ser mayor a 0"),
    unitCost: z.number().min(0, "El costo unitario debe ser mayor o igual a 0"),
    discountPct: z.number().min(0).max(100).nullable().optional(),
    lotNumber: z.string().trim().min(1).max(64).nullable().optional(),
    expirationDate: z.string().nullable().optional(),
  })
  .refine((item) => Boolean(item.lotNumber) === Boolean(item.expirationDate), {
    message: "El lote y la fecha de caducidad deben capturarse juntos",
    path: ["lotNumber"],
  });

export const createPurchaseSchema = z.object({
  providerId: z.string().uuid("Selecciona un proveedor"),
  branchId: z.string().uuid(),
  paymentMethodId: z.string().uuid("Selecciona una forma de pago"),
  notes: z.string().max(1000).nullable().optional(),
  items: z.array(purchaseItemSchema).min(1, "Agrega al menos un producto"),
});

export type CreatePurchaseSchema = z.infer<typeof createPurchaseSchema>;
