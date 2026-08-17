import { z } from "zod";

export const createSimpleWaybillItemSchema = z.object({
  productId: z.string().uuid("Selecciona un producto del catálogo"),
  description: z.string().min(1, "La descripción es obligatoria"),
  quantity: z.number().positive("La cantidad debe ser mayor a 0"),
});

export const createSimpleWaybillSchema = z
  .object({
    type: z.literal("simple"),
    originBranchId: z.string().uuid("Selecciona la sucursal de origen"),
    destinationBranchId: z.string().uuid("Selecciona la sucursal de destino"),
    transferDate: z.string().min(1, "La fecha de traspaso es obligatoria"),
    notes: z.string().nullable().optional(),
    items: z.array(createSimpleWaybillItemSchema).min(1, "Agrega al menos una mercancía"),
  })
  .superRefine((d, ctx) => {
    if (d.originBranchId === d.destinationBranchId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Origen y destino deben ser sucursales distintas",
        path: ["destinationBranchId"],
      });
    }
  });

export const createWaybillSchema = createSimpleWaybillSchema;

export type CreateWaybillFormValues = z.infer<typeof createWaybillSchema>;
