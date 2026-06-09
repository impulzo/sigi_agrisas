import { z } from "zod";

export const adjustStockSchema = z.object({
  delta: z
    .number()
    .refine((v) => v !== 0, { message: "El delta no puede ser cero." }),
  reason: z.string().max(200).optional(),
});

export type AdjustStockFormValues = z.infer<typeof adjustStockSchema>;
