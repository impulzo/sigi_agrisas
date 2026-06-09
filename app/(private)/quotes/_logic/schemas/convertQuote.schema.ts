import { z } from "zod";

export const convertQuoteSchema = z.object({
  paymentMethodId: z.string().uuid("Forma de pago requerida"),
  folioId: z.string().uuid("Folio fiscal requerido"),
  notes: z.string().max(1000).optional().nullable(),
});

export type ConvertQuoteInput = z.infer<typeof convertQuoteSchema>;
