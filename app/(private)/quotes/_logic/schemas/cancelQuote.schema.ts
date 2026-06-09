import { z } from "zod";

export const cancelQuoteSchema = z.object({
  reason: z.string().max(500).optional().nullable(),
});

export type CancelQuoteInput = z.infer<typeof cancelQuoteSchema>;
