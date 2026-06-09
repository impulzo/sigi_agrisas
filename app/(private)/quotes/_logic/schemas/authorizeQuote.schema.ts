import { z } from "zod";

export const authorizeQuoteSchema = z.object({
  notes: z.string().max(1000).optional().nullable(),
});

export type AuthorizeQuoteInput = z.infer<typeof authorizeQuoteSchema>;
