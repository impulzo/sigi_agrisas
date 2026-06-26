import { z } from "zod";

export const stampSaleSchema = z.object({
  saleId: z.string().uuid("Selecciona una venta válida"),
  paymentForm: z.string().max(4).optional(),
  paymentMethod: z.string().max(4).optional(),
  cfdiUse: z.string().max(8).optional(),
});

export type StampSaleFormValues = z.infer<typeof stampSaleSchema>;
