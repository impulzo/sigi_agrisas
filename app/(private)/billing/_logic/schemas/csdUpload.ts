import { z } from "zod";

export const csdUploadSchema = z.object({
  rfc: z.string().min(12, "RFC inválido").max(13),
  certificateBase64: z.string().min(1, "Requerido"),
  privateKeyBase64: z.string().min(1, "Requerido"),
  privateKeyPassword: z.string().min(1, "Requerido"),
});

export type CsdUploadFormValues = z.infer<typeof csdUploadSchema>;
