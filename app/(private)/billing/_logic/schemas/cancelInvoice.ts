import { z } from "zod";

export const cancelInvoiceSchema = z.object({
  motive: z.enum(["01", "02", "03", "04"], { required_error: "Selecciona un motivo" }),
  uuidReplacement: z.string().max(40).nullable().optional(),
}).superRefine((data, ctx) => {
  if (data.motive === "01" && !data.uuidReplacement?.trim()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Motivo 01 requiere el UUID de sustitución",
      path: ["uuidReplacement"],
    });
  }
});

export type CancelInvoiceFormValues = z.infer<typeof cancelInvoiceSchema>;
