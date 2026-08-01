import { z } from "zod";

export const cancelWaybillSchema = z.object({
  reason: z
    .string()
    .trim()
    .min(3, "El motivo es obligatorio (mín. 3 caracteres)")
    .max(500, "El motivo no puede exceder 500 caracteres"),
});

export type CancelWaybillFormValues = z.infer<typeof cancelWaybillSchema>;
